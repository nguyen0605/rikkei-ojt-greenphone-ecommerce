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

// [ORD-05] Tự động hủy đơn hàng quá 15 phút chưa thanh toán & hoàn tồn kho + voucher
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderTimeoutScheduler {

    // Chỉ áp dụng cho thanh toán online (VIETQR, SEPAY)
    private static final List<String> EXPIRABLE_PAYMENT_METHODS = List.of("VIETQR", "SEPAY");

    private final OrderRepository orderRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final UserPromotionRepository userPromotionRepository;
    private final EntityManager entityManager;

    @Value("${app.order.timeout-minutes:15}")
    private int timeoutMinutes = 15;

    // Chạy mỗi phút 1 lần để quét đơn quá hạn (TUYỆT ĐỐI KHÔNG hủy đơn COD)
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void cancelExpiredPendingOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<Order> expiredOrders = orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                "PENDING", "UNPAID", EXPIRABLE_PAYMENT_METHODS, cutoff);

        if (expiredOrders.isEmpty()) return;

        log.info("Tự động hủy {} đơn hàng hết hạn", expiredOrders.size());

        for (Order order : expiredOrders) {
            try {
                cancelOne(order);
            } catch (OptimisticLockException e) {
                // Bỏ qua nếu có xung đột với Webhook thanh toán, sẽ quét lại ở lần chạy sau
                log.warn("Đơn #{} đang có giao dịch khác, bỏ qua lần này", order.getId());
            }
        }
    }

    // Xử lý hủy 1 đơn hàng cụ thể
    private void cancelOne(Order order) {
        // Khóa bi quan đơn hàng để tránh xung đột với khách vừa thanh toán
        Order fresh = orderRepository.findByIdForUpdate(order.getId()).orElse(null);
        if (fresh == null) return;
        entityManager.refresh(fresh, LockModeType.PESSIMISTIC_WRITE);

        // Đơn đã thanh toán hoặc đã đổi trạng thái thì dừng lại
        if (!"PENDING".equals(fresh.getOrderStatus()) || !"UNPAID".equals(fresh.getPaymentStatus())) {
            return;
        }

        // Không bao giờ hủy đơn COD
        if (!EXPIRABLE_PAYMENT_METHODS.contains(fresh.getPaymentMethod())) {
            return;
        }

        // 1. Hoàn tồn kho cho từng sản phẩm
        for (OrderDetail detail : fresh.getOrderDetails()) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant != null && variant.getStockQuantity() != null) {
                PhoneVariant locked = phoneVariantRepository.findByIdWithLock(variant.getId())
                        .orElseThrow(() -> new IllegalStateException("Không tìm thấy sản phẩm: " + variant.getId()));
                
                entityManager.refresh(locked, LockModeType.PESSIMISTIC_WRITE);
                int quantityBefore = locked.getStockQuantity();
                locked.setStockQuantity(quantityBefore + detail.getQuantity()); // Cộng lại kho
                
                // Ghi nhật ký hoàn kho (Audit Log)
                if (detail.getWarehouseId() == null) {
                    inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn kho do đơn hết hạn");
                } else {
                    inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn kho do đơn hết hạn", detail.getWarehouseId());
                }
                phoneVariantRepository.save(locked);
            }
        }

        // 2. Hoàn lại voucher nếu có
        UserPromotion up = fresh.getUserPromotion();
        if (up != null) {
            up.setStatus("AVAILABLE");
            up.setUsedAt(null);
            userPromotionRepository.save(up);
            fresh.setUserPromotion(null);
        }

        // 3. Đánh dấu đơn hàng là ĐÃ HỦY
        fresh.setOrderStatus("CANCELLED");
        fresh.setPaymentStatus("UNPAID");
        fresh.setNote("Quá hạn thanh toán " + timeoutMinutes + " phút");
        orderRepository.save(fresh);
        log.info("Đã hủy đơn hàng hết hạn #{}", fresh.getId());
    }
}
