package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.UserPromotion;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-cancels PENDING orders that have been unpaid for more than configured timeout minutes (default 15).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderTimeoutScheduler {

    private static final List<String> EXPIRABLE_PAYMENT_METHODS = List.of("VIETQR", "SEPAY");

    private final OrderRepository orderRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final UserPromotionRepository userPromotionRepository;
    private final EntityManager entityManager;

    @Value("${app.order.timeout-minutes:15}")
    private int timeoutMinutes = 15;

    /**
     * Runs every 60 seconds. Cancels orders that are PENDING + UNPAID for > timeoutMinutes
     * with payment methods VIETQR / SEPAY. COD orders are strictly excluded.
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void cancelExpiredPendingOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<Order> expiredOrders = orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                "PENDING", "UNPAID", EXPIRABLE_PAYMENT_METHODS, cutoff);

        if (expiredOrders.isEmpty()) return;

        log.info("Auto-cancelling {} expired PENDING orders (older than {} min)", expiredOrders.size(), timeoutMinutes);

        for (Order order : expiredOrders) {
            try {
                cancelOne(order);
            } catch (OptimisticLockException e) {
                // Another writer (payment webhook, user cancel) updated this order concurrently —
                // skip it this round, it will be re-evaluated next tick.
                log.warn("Order #{} skipped: concurrent modification ({}). Will re-evaluate next tick.",
                        order.getId(), e.getMessage());
            }
        }
    }

    private void cancelOne(Order order) {
        // Re-check freshness + terminal state inside the same transaction to
        // avoid acting on an order that was paid since the query.
        Order fresh = orderRepository.findByIdForUpdate(order.getId()).orElse(null);
        if (fresh == null) return;
        entityManager.refresh(fresh, LockModeType.PESSIMISTIC_WRITE);
        if (!"PENDING".equals(fresh.getOrderStatus()) || !"UNPAID".equals(fresh.getPaymentStatus())) {
            return; // paid or otherwise changed — leave it alone
        }

        // Strictly do not cancel COD orders
        if (!EXPIRABLE_PAYMENT_METHODS.contains(fresh.getPaymentMethod())) {
            return;
        }

        // Restore stock
        for (OrderDetail detail : fresh.getOrderDetails()) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant != null && variant.getStockQuantity() != null) {
                PhoneVariant locked = phoneVariantRepository.findByIdWithLock(variant.getId())
                        .orElseThrow(() -> new IllegalStateException("Inventory variant not found: " + variant.getId()));
                // OrderDetail eagerly loads variants; reload stock after acquiring the lock
                // rather than reusing a possibly stale entity from the persistence context.
                entityManager.refresh(locked, LockModeType.PESSIMISTIC_WRITE);
                int quantityBefore = locked.getStockQuantity();
                locked.setStockQuantity(quantityBefore + detail.getQuantity());
                if (detail.getWarehouseId() == null) {
                    inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn kho do đơn hết hạn");
                } else {
                    inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn kho do đơn hết hạn", detail.getWarehouseId());
                }
                phoneVariantRepository.save(locked);
            }
        }

        // Restore voucher/promotion if applied
        UserPromotion up = fresh.getUserPromotion();
        if (up != null) {
            up.setStatus("AVAILABLE");
            up.setUsedAt(null);
            userPromotionRepository.save(up);
        }

        fresh.setOrderStatus("CANCELLED");
        fresh.setPaymentStatus("UNPAID");
        fresh.setNote("Quá hạn thanh toán " + timeoutMinutes + " phút");
        orderRepository.save(fresh);
        log.info("Cancelled expired order #{} and restored stock", fresh.getId());
    }
}
