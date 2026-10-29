package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-cancels PENDING orders that have been unpaid for more than 10 minutes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderTimeoutScheduler {

    private final OrderRepository orderRepository;
    private final PhoneVariantRepository phoneVariantRepository;

    /**
     * Runs every 60 seconds. Cancels orders that are PENDING + UNPAID for > 10 minutes.
     */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void cancelExpiredPendingOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(10);
        List<Order> expiredOrders = orderRepository.findByOrderStatusAndPaymentStatusAndCreatedAtBefore(
                "PENDING", "UNPAID", cutoff);

        if (expiredOrders.isEmpty()) return;

        log.info("Auto-cancelling {} expired PENDING orders (older than 10 min)", expiredOrders.size());

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
        Order fresh = orderRepository.findById(order.getId()).orElse(null);
        if (fresh == null) return;
        if (!"PENDING".equals(fresh.getOrderStatus()) || !"UNPAID".equals(fresh.getPaymentStatus())) {
            return; // paid or otherwise changed — leave it alone
        }

        // Restore stock
        for (OrderDetail detail : fresh.getOrderDetails()) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant != null && variant.getStockQuantity() != null) {
                variant.setStockQuantity(variant.getStockQuantity() + detail.getQuantity());
                phoneVariantRepository.save(variant);
            }
        }
        fresh.setOrderStatus("CANCELLED");
        fresh.setPaymentStatus("UNPAID");
        orderRepository.save(fresh);
        log.info("Order #{} auto-cancelled (timeout)", fresh.getId());
    }
}
