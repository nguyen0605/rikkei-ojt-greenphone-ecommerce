package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.ConfirmRefundRequest;
import com.re.greenphone.dto.request.CreateRefundRequest;
import com.re.greenphone.dto.response.RefundDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.RefundMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final PromotionRepository promotionRepository;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final RefundTransactionRepository refundTransactionRepository;
    private final RefundMapper refundMapper;
    private final EmailService emailService;
    private final WarehouseTransferService warehouseTransferService;
    private final jakarta.persistence.EntityManager entityManager;

    /**
     * Khách hàng (hoặc Admin) tạo yêu cầu hoàn tiền cho đơn hàng.
     * Đơn hàng sẽ được chuyển sang CANCELLED, hoàn kho và voucher ngay để ngăn xuất giao.
     */
    @Transactional
    public RefundDTO requestRefund(Long orderId, CreateRefundRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        String currentUserRole = SecurityUtils.getCurrentUserRole();

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // 1. Chống IDOR: Khách chỉ được yêu cầu cho đơn của mình; Admin có quyền hỗ trợ
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(currentUserRole);
        if (!isAdmin && !order.getUser().getId().equals(currentUserId)) {
            throw new BadRequestException("Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này");
        }

        // 2. Kiểm tra trạng thái thanh toán: Bắt buộc phải là PAID
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new BadRequestException("Chỉ đơn hàng đã thanh toán thành công mới có thể yêu cầu hoàn tiền. Hiện tại: " + order.getPaymentStatus());
        }

        // 3. Chống double refund: Kiểm tra bảng refund_transaction
        if (refundTransactionRepository.findByOrderId(orderId).isPresent()) {
            throw new BadRequestException("Đơn hàng này đã có yêu cầu hoàn tiền đang được xử lý hoặc đã hoàn tất");
        }

        // 4. Kiểm tra phương thức thanh toán: Chỉ áp dụng cho đơn Online/Banking (loại trừ COD chưa hoàn tất đối soát)
        if (!"BANKING".equalsIgnoreCase(order.getPaymentMethod()) && !"VIETQR".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new BadRequestException("Chỉ hỗ trợ hoàn tiền qua chuyển khoản cho đơn thanh toán Online/Banking. Phương thức: " + order.getPaymentMethod());
        }

        // 5. Kiểm tra trạng thái đơn hàng: Từ chối đơn SHIPPING hoặc COMPLETED/DELIVERED
        if ("SHIPPING".equalsIgnoreCase(order.getOrderStatus()) || "DELIVERED".equalsIgnoreCase(order.getOrderStatus()) || "COMPLETED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new BadRequestException("Đơn hàng đang giao hoặc đã giao thành công không thể hoàn tiền trực tiếp. Vui lòng liên hệ CSKH để xử lý quy trình đổi trả.");
        }

        // 6. Kiểm tra giao dịch Payment
        List<Payment> payments = paymentRepository.findByOrderIdOrderByIdAsc(orderId);
        Payment payment = payments.isEmpty() ? null : payments.get(0);

        // 7. Hoàn trả tồn kho và voucher nếu đơn chưa từng bị CANCELLED
        if (!"CANCELLED".equalsIgnoreCase(order.getOrderStatus())) {
            restoreStockForOrder(order);
            restoreVoucherForOrder(order);
            order.setOrderStatus("CANCELLED");
        }

        // 8. Lưu bản ghi RefundTransaction ở trạng thái REQUESTED
        RefundTransaction refundTransaction = RefundTransaction.builder()
                .order(order)
                .payment(payment)
                .amount(order.getFinalAmount())
                .status("REQUESTED")
                .reason(request.getReason().trim())
                .bankName(request.getBankName())
                .bankAccount(request.getBankAccount())
                .accountHolder(request.getAccountHolder())
                .requestedBy(currentUserId)
                .build();

        refundTransaction = refundTransactionRepository.save(refundTransaction);
        orderRepository.save(order);

        log.info("Refund requested for order #{}, amount: {}", orderId, order.getFinalAmount());
        return refundMapper.toDto(refundTransaction);
    }

    /**
     * Admin nhận xử lý yêu cầu hoàn tiền (Claim).
     * Đảm bảo tính nguyên tử: Chỉ đúng 1 Admin claim được yêu cầu.
     */
    @Transactional
    public RefundDTO claimRefund(Long orderId) {
        Long adminId = SecurityUtils.getCurrentUserId();

        RefundTransaction refund = refundTransactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("RefundTransaction for order: " + orderId));

        if (!"REQUESTED".equalsIgnoreCase(refund.getStatus())) {
            throw new BadRequestException("Yêu cầu hoàn tiền không ở trạng thái chờ tiếp nhận. Hiện tại: " + refund.getStatus());
        }

        int updatedRows = refundTransactionRepository.claimRefund(orderId, adminId);
        if (updatedRows == 0) {
            throw new BadRequestException("Yêu cầu hoàn tiền đã được Admin khác tiếp nhận xử lý trước đó");
        }

        refund.setStatus("PROCESSING");
        refund.setProcessedBy(adminId);
        log.info("Admin #{} claimed refund for order #{}", adminId, orderId);
        return refundMapper.toDto(refund);
    }

    /**
     * Admin xác nhận đã chuyển tiền thành công cho khách hàng ngoài hệ thống.
     * Cập nhật orderStatus = REFUNDED, paymentStatus = REFUNDED, gửi email xác nhận.
     */
    @Transactional
    public RefundDTO confirmRefund(Long orderId, ConfirmRefundRequest request) {
        Long adminId = SecurityUtils.getCurrentUserId();

        RefundTransaction refund = refundTransactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("RefundTransaction for order: " + orderId));

        if (!"PROCESSING".equalsIgnoreCase(refund.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận hoàn tiền khi yêu cầu đang ở trạng thái PROCESSING. Hiện tại: " + refund.getStatus());
        }

        if (refund.getProcessedBy() != null && !refund.getProcessedBy().equals(adminId)) {
            throw new BadRequestException("Yêu cầu này đang được xử lý bởi Admin khác. Bạn không thể xác nhận.");
        }

        Order order = refund.getOrder();
        order.setOrderStatus("REFUNDED");
        order.setPaymentStatus("REFUNDED");
        orderRepository.save(order);

        refund.setStatus("COMPLETED");
        refund.setTransactionRef(request.getTransactionRef().trim());
        refund.setRefundedAt(LocalDateTime.now());
        refundTransactionRepository.save(refund);

        // Gửi email bất đồng bộ SAU KHI Transaction đã commit thành công 100%
        if (order.getUser() != null && order.getUser().getEmail() != null) {
            String userEmail = order.getUser().getEmail();
            String orderCode = String.valueOf(order.getId());
            BigDecimal amount = refund.getAmount();
            String reason = refund.getReason();

            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        emailService.sendRefundConfirmation(userEmail, orderCode, amount, reason);
                    }
                });
            } else {
                emailService.sendRefundConfirmation(userEmail, orderCode, amount, reason);
            }
        }

        log.info("Refund completed for order #{} by admin #{}", orderId, adminId);
        return refundMapper.toDto(refund);
    }

    @Transactional(readOnly = true)
    public RefundDTO getRefundByOrderId(Long orderId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        String currentUserRole = SecurityUtils.getCurrentUserRole();

        RefundTransaction refund = refundTransactionRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("RefundTransaction for order: " + orderId));

        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(currentUserRole);
        if (!isAdmin && !refund.getRequestedBy().equals(currentUserId)) {
            throw new BadRequestException("Bạn không có quyền xem thông tin hoàn tiền của đơn hàng này");
        }

        return refundMapper.toDto(refund);
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private void restoreStockForOrder(Order order) {
        boolean wasWaitingForTransfer = "WAITING_FOR_TRANSFER".equalsIgnoreCase(order.getOrderStatus());

        // Sắp xếp variantId tăng dần để triệt tiêu Deadlock
        List<OrderDetail> sortedDetails = order.getOrderDetails().stream()
                .filter(d -> d.getPhoneVariant() != null)
                .sorted(Comparator.comparing(d -> d.getPhoneVariant().getId()))
                .toList();

        for (OrderDetail detail : sortedDetails) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant.getStockQuantity() != null) {
                PhoneVariant locked = variant;
                if (entityManager.contains(locked)) {
                    entityManager.refresh(locked, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                } else {
                    locked = phoneVariantRepository.findByIdWithLock(locked.getId()).orElse(locked);
                }
                int quantityBefore = locked.getStockQuantity();
                locked.setStockQuantity(quantityBefore + detail.getQuantity());
                if (wasWaitingForTransfer) {
                    inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn tiền đơn hàng chờ điều chuyển #" + order.getId());
                } else if (detail.getWarehouseId() == null) {
                    inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn tiền đơn hàng #" + order.getId());
                } else {
                    inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hoàn tiền đơn hàng #" + order.getId(), detail.getWarehouseId());
                }
                phoneVariantRepository.save(locked);
            }
        }

        if (wasWaitingForTransfer) {
            warehouseTransferService.cancelTransfersForOrder(order.getId(), "Hoàn tiền đơn hàng #" + order.getId());
        }
    }

    private void restoreVoucherForOrder(Order order) {
        if (order.getUserPromotion() != null) {
            UserPromotion up = order.getUserPromotion();
            Promotion promo = up.getPromotion();
            LocalDateTime now = LocalDateTime.now();

            if (promo != null && "ACTIVE".equalsIgnoreCase(promo.getStatus())
                    && (promo.getEndDate() == null || promo.getEndDate().isAfter(now))) {
                up.setStatus("AVAILABLE");
            } else {
                up.setStatus("EXPIRED");
            }
            up.setUsedAt(null);
            userPromotionRepository.save(up);

            if (promo != null && promo.getUsedQuantity() != null && promo.getUsedQuantity() > 0) {
                promo.setUsedQuantity(promo.getUsedQuantity() - 1);
                promotionRepository.save(promo);
            }

            order.setUserPromotion(null);
        }
    }
}

