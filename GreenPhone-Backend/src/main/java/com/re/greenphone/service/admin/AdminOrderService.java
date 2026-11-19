package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.AdminOrderDetailDTO;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.dto.response.OrderHistoryDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderHistory;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.entity.UserPromotion;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.OrderHistoryRepository;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.service.EmailService;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import com.re.greenphone.entity.ReturnRequest;
import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.enums.ReturnType;
import com.re.greenphone.repository.ReturnRequestRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminOrderService {

    private static final List<String> VALID_ORDER_STATUSES = List.of(
            "PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED", "WAITING_FOR_TRANSFER"
    );

    private final OrderRepository orderRepository;
    private final OrderHistoryRepository orderHistoryRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PaymentRepository paymentRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final PromotionRepository promotionRepository;
    private final OrderMapper orderMapper;
    private final EmailService emailService;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final com.re.greenphone.service.WarehouseTransferService warehouseTransferService;
    private final com.re.greenphone.service.WarrantyService warrantyService;
    private final ReturnRequestRepository returnRequestRepository;
    private final UserRepository userRepository;
    private final jakarta.persistence.EntityManager entityManager;

    private boolean isValidTransition(String current, String next) {
        if (current == null || next == null) return false;
        if (current.equals(next)) return true;

        return switch (current) {
            case "PENDING" -> "CONFIRMED".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "WAITING_FOR_TRANSFER" -> "PROCESSING".equals(next) || "CANCELLED".equals(next);
            case "CONFIRMED" -> "PROCESSING".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "PROCESSING" -> "SHIPPING".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "SHIPPING" -> "DELIVERED".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "DELIVERED" -> "COMPLETED".equals(next);
            case "CANCELLED", "COMPLETED" -> false; // Terminal states
            default -> false;
        };
    }

    private boolean isValidPaymentTransition(String current, String next) {
        if (next == null) return false;
        String cur = (current != null ? current : "UNPAID").toUpperCase();
        String nxt = next.toUpperCase();
        if (cur.equals(nxt)) return true;

        return switch (cur) {
            case "UNPAID" -> "PAID".equals(nxt);
            case "PAID" -> "REFUND_PENDING".equals(nxt);
            case "REFUND_PENDING" -> "REFUNDED".equals(nxt) || "PAID".equals(nxt);
            case "REFUNDED" -> false; // Terminal state: đã hoàn tiền không thể chuyển đổi
            default -> false;
        };
    }

    public PageResponse<OrderDTO> getOrders(String status, String search, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> page;
        if (search != null && !search.isBlank()) {
            page = orderRepository.findByOrderStatusOrUserInfo(search, status, pageable);
        } else if (status != null && !status.isBlank()) {
            page = orderRepository.findByOrderStatus(status, pageable);
        } else {
            page = orderRepository.findAll(pageable);
        }

        List<OrderDTO> dtos = orderMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public AdminOrderDetailDTO getOrderDetail(Long id) {
        Order order = orderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        AdminOrderDetailDTO dto = orderMapper.toAdminDetailDto(order);

        List<OrderHistoryDTO> histories = orderHistoryRepository.findByOrderIdOrderByCreatedAtDesc(id)
                .stream()
                .map(h -> OrderHistoryDTO.builder()
                        .id(h.getId())
                        .orderId(id)
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .note(h.getNote())
                        .changedBy(h.getChangedBy())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();

        dto.setHistories(histories);
        return dto;
    }

    public OrderDTO updateStatus(Long id, String status) {
        return updateStatus(id, status, null);
    }

    public OrderDTO updateStatus(Long id, String status, String reason) {
        Order order = ("CANCELLED".equals(status) ? orderRepository.findByIdForUpdate(id) : orderRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (status == null || !VALID_ORDER_STATUSES.contains(status)) {
            throw new BadRequestException("Trạng thái đơn hàng không hợp lệ: " + status);
        }

        // Khóa vĩnh viễn trạng thái đơn hàng khi đã hoàn tiền thành công (REFUNDED)
        if ("REFUNDED".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new BadRequestException("Đơn hàng đã hoàn tiền thành công, trạng thái đơn hàng đã bị khóa vĩnh viễn");
        }

        String currentStatus = order.getOrderStatus();
        if (!isValidTransition(currentStatus, status)) {
            throw new BadRequestException(
                    String.format("Vi phạm quy trình: Không thể chuyển trạng thái đơn hàng từ %s sang %s", currentStatus, status));
        }

        if (currentStatus.equals(status)) {
            return orderMapper.toDto(order);
        }

        if ("CANCELLED".equals(status)) {
            boolean wasWaitingForTransfer = "WAITING_FOR_TRANSFER".equals(currentStatus);
            // Restore stock (pessimistic lock per variant — no double-restore)
            for (var detail : order.getOrderDetails()) {
                PhoneVariant variant = detail.getPhoneVariant();
                if (variant != null && variant.getStockQuantity() != null) {
                    PhoneVariant locked = phoneVariantRepository.findByIdWithLock(variant.getId())
                            .orElse(variant);
                    entityManager.refresh(locked, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                    int quantityBefore = locked.getStockQuantity();
                    locked.setStockQuantity(quantityBefore + detail.getQuantity());
                    if (wasWaitingForTransfer) {
                        inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Admin hủy đơn hàng chờ điều chuyển");
                    } else if (detail.getWarehouseId() == null) {
                        inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Admin hủy đơn hàng");
                    } else {
                        inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Admin hủy đơn hàng", detail.getWarehouseId());
                    }
                    phoneVariantRepository.save(locked);
                }
            }

            if (wasWaitingForTransfer) {
                warehouseTransferService.cancelTransfersForOrder(order.getId(), reason);
            }

            // Restore the promotion so the voucher can be reused (only if not expired)
            if (order.getUserPromotion() != null) {
                UserPromotion up = order.getUserPromotion();
                Promotion promo = up.getPromotion();
                LocalDateTime now = LocalDateTime.now();

                if (promo != null && "ACTIVE".equals(promo.getStatus())
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

                // QUAN TRỌNG: Gỡ bỏ khóa ngoại để giải phóng ràng buộc UNIQUE trên bảng orders
                order.setUserPromotion(null);
            }

            // Money state: Nếu đơn đã thanh toán (PAID), chuyển sang REFUND_PENDING để kế toán chuyển tiền hoàn
            boolean isPaid = "PAID".equalsIgnoreCase(order.getPaymentStatus());
            if (isPaid && reason != null && (reason.trim().equalsIgnoreCase("Lý do khác") || reason.trim().isEmpty())) {
                throw new BadRequestException("Đối với đơn hàng đã thanh toán, vui lòng nhập chi tiết lý do hủy đơn");
            }

            if (isPaid) {
                order.setPaymentStatus("REFUND_PENDING");
            }

            if (reason != null && !reason.isBlank()) {
                String existingNote = order.getNote() != null ? order.getNote().trim() : "";
                String prefix = "[Lý do hủy: " + reason.trim() + "]";
                if (existingNote.isEmpty()) {
                    order.setNote(prefix);
                } else if (!existingNote.contains("[Lý do hủy:")) {
                    order.setNote(prefix + " " + existingNote);
                }
            }
        }

        order.setOrderStatus(status);
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(currentStatus)
                .toStatus(status)
                .note(reason != null && !reason.isBlank() ? reason.trim() : "Quản trị viên chuyển trạng thái sang " + status)
                .changedBy("ADMIN")
                .build());

        if ("SHIPPING".equals(status)) {
            warehouseTransferService.deductFulfillmentStockAtDestination(order);
        }

        if ("DELIVERED".equals(status) || "COMPLETED".equals(status)) {
            warrantyService.activateWarrantyForOrder(order);
        }

        if ("DELIVERED".equals(status)) {
            sendDeliveredEmail(order);
        }

        return orderMapper.toDto(order);
    }

    public OrderDTO updatePaymentStatus(Long id, String paymentStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (paymentStatus == null || !List.of("UNPAID", "PAID", "REFUND_PENDING", "REFUNDED").contains(paymentStatus.toUpperCase())) {
            throw new BadRequestException("Trạng thái thanh toán không hợp lệ: " + paymentStatus);
        }

        String targetStatus = paymentStatus.toUpperCase();
        String previousPaymentStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toUpperCase() : "UNPAID";

        if (!isValidPaymentTransition(previousPaymentStatus, targetStatus)) {
            throw new BadRequestException(String.format(
                    "Vi phạm quy trình: Không thể chuyển trạng thái thanh toán từ %s sang %s",
                    previousPaymentStatus, targetStatus));
        }

        if (previousPaymentStatus.equals(targetStatus)) {
            return orderMapper.toDto(order);
        }

        // Đồng bộ bản ghi Payment khi chuyển sang PAID
        if ("PAID".equals(targetStatus)) {
            List<Payment> payments = paymentRepository.findByOrderIdOrderByIdAsc(order.getId());
            if (payments.isEmpty()) {
                Payment payment = Payment.builder()
                        .order(order)
                        .paymentProvider(order.getPaymentMethod() != null ? order.getPaymentMethod() : "MANUAL_ADMIN")
                        .transactionCode("MANUAL-" + order.getId() + "-" + System.currentTimeMillis())
                        .amount(order.getFinalAmount() != null ? order.getFinalAmount() : order.getTotalAmount())
                        .paidAt(LocalDateTime.now())
                        .build();
                paymentRepository.save(payment);
            } else {
                for (Payment payment : payments) {
                    if (payment.getPaidAt() == null) {
                        payment.setPaidAt(LocalDateTime.now());
                        paymentRepository.save(payment);
                    }
                }
            }
        }

        if ("REFUNDED".equals(targetStatus)) {
            String existingNote = order.getNote() != null ? order.getNote().trim() : "";
            String refundTag = "[Kế toán đã hoàn tiền thành công lúc " + java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(LocalDateTime.now()) + "]";
            if (!existingNote.contains("[Kế toán đã hoàn tiền")) {
                order.setNote(existingNote.isEmpty() ? refundTag : existingNote + " " + refundTag);
            }
        }

        order.setPaymentStatus(targetStatus);
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(previousPaymentStatus)
                .toStatus(targetStatus)
                .note("REFUNDED".equals(targetStatus) ? "Kế toán đã hoàn tiền thành công" : "Cập nhật trạng thái thanh toán sang " + targetStatus)
                .changedBy("ADMIN")
                .build());

        // [TỰ ĐỘNG LIÊN THÔNG]: Khi admin xác nhận hoàn tiền (REFUNDED), tự động đồng bộ sang bảng return_request để trang Đổi trả & Hoàn tiền theo dõi
        if ("REFUNDED".equalsIgnoreCase(paymentStatus)) {
            syncToReturnRequestOnRefund(order);
        }

        return orderMapper.toDto(order);
    }

    public OrderDTO confirmOrder(Long id) {
        return updateStatus(id, "CONFIRMED");
    }

    public OrderDTO issueInvoice(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (order.getCompanyName() == null || order.getCompanyName().isBlank()) {
            throw new BadRequestException("Đơn hàng không có thông tin yêu cầu xuất hóa đơn VAT");
        }

        if ("ISSUED".equalsIgnoreCase(order.getInvoiceStatus())) {
            throw new BadRequestException("Hóa đơn VAT cho đơn hàng này đã được phát hành trước đó");
        }

        if ("CANCELLED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new BadRequestException("Không thể phát hành hóa đơn cho đơn hàng đã bị hủy");
        }

        order.setInvoiceStatus("ISSUED");
        order.setInvoiceIssuedAt(LocalDateTime.now());
        if (order.getInvoiceToken() == null || order.getInvoiceToken().isBlank()) {
            order.setInvoiceToken(java.util.UUID.randomUUID().toString());
        }
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(order.getOrderStatus())
                .toStatus(order.getOrderStatus())
                .note("Kế toán / Quản trị viên đã kiểm tra và duyệt phát hành Hóa đơn điện tử GTGT")
                .changedBy("ADMIN")
                .build());

        log.info("Invoice issued for order #{}: companyName={}, taxCode={}", id, order.getCompanyName(), order.getTaxCode());
        return orderMapper.toDto(order);
    }

    public OrderDTO updateDeliveryStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (!List.of("CONFIRMED", "PROCESSING", "SHIPPING").contains(order.getOrderStatus())) {
            throw new BadRequestException("Không thể cập nhật thông tin giao hàng khi đơn ở trạng thái: " + order.getOrderStatus());
        }

        String currentStatus = order.getOrderStatus();
        order.setOrderStatus(status);
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(currentStatus)
                .toStatus(status)
                .note("Cập nhật trạng thái giao hàng sang " + status)
                .changedBy("ADMIN")
                .build());

        if ("DELIVERED".equals(status) || "COMPLETED".equals(status)) {
            warrantyService.activateWarrantyForOrder(order);
            sendDeliveredEmail(order);
        }

        return orderMapper.toDto(order);
    }

    private void sendDeliveredEmail(Order order) {
        try {
            String receiverName = order.getReceiverName() != null ? order.getReceiverName() : "bạn";
            java.util.List<String> productNames = order.getOrderDetails() == null
                    ? java.util.List.of()
                    : order.getOrderDetails().stream()
                            .map(d -> d.getProductName() != null ? d.getProductName() : "")
                            .filter(n -> !n.isBlank())
                            .distinct()
                            .toList();
            if (order.getUser() != null && order.getUser().getEmail() != null) {
                emailService.sendOrderDelivered(
                        order.getUser().getEmail(),
                        String.valueOf(order.getId()),
                        receiverName,
                        productNames);
            }
        } catch (Exception e) {
            log.error("Failed to trigger delivered email for order {}", order.getId(), e);
        }
    }

    /**
     * Tự động đồng bộ phiếu sang bảng return_request khi đơn hàng được đánh dấu hoàn tiền (REFUNDED)
     * Giúp trang Thẩm định Đổi trả & Hoàn tiền (/admin/doi-tra) ghi nhận được lịch sử hoàn tiền này.
     */
    private void syncToReturnRequestOnRefund(Order order) {
        try {
            // Kiểm tra xem đơn hàng này đã có phiếu hoàn tiền chưa để tránh trùng lặp
            List<ReturnRequest> existingRequests = returnRequestRepository.findByOrderId(order.getId());
            boolean alreadyHasRefund = existingRequests.stream()
                    .anyMatch(r -> r.getType() == ReturnType.REFUND);

            if (alreadyHasRefund) {
                log.info("Đơn hàng #{} đã có bản ghi hoàn tiền trong return_request, bỏ qua tạo mới", order.getId());
                return;
            }

            // Lấy PhoneVariant đại diện từ chi tiết đơn hàng (bắt buộc trong entity ReturnRequest)
            PhoneVariant variant = null;
            if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
                variant = order.getOrderDetails().get(0).getPhoneVariant();
            }

            if (variant == null) {
                log.warn("Đơn hàng #{} không tìm thấy PhoneVariant trong orderDetails để tạo ReturnRequest", order.getId());
                return;
            }

            // Lấy thông tin admin hiện tại đang thao tác
            Long currentUserId = SecurityUtils.getCurrentUser() != null ? SecurityUtils.getCurrentUser().getId() : null;
            com.re.greenphone.entity.User adminUser = (currentUserId != null)
                    ? userRepository.findById(currentUserId).orElse(null)
                    : null;

            String returnCode = "REF-" + order.getId() + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();

            ReturnRequest returnRequest = ReturnRequest.builder()
                    .returnCode(returnCode)
                    .order(order)
                    .phoneVariant(variant)
                    .user(order.getUser())
                    .reason("Admin hoàn tiền cho đơn hàng (Quản lý đơn hàng)")
                    .errorDescription("Hoàn tiền đơn hàng #" + order.getId() + " với số tiền " + order.getFinalAmount() + " VNĐ")
                    .proofImagesJson("[]")
                    .type(ReturnType.REFUND)
                    .status(ReturnStatus.COMPLETED)
                    .refundAmount(order.getFinalAmount() != null ? order.getFinalAmount() : java.math.BigDecimal.ZERO)
                    .adminNote("Kế toán/Admin đã xác nhận hoàn tiền thành công")
                    .reviewedBy(adminUser)
                    .reviewedAt(LocalDateTime.now())
                    .build();

            returnRequestRepository.save(returnRequest);
            log.info("Đã tự động tạo phiếu ReturnRequest hoàn tiền: code={}, orderId={}", returnCode, order.getId());
        } catch (Exception ex) {
            log.error("Lỗi khi tự động đồng bộ sang ReturnRequest cho đơn #{}: {}", order.getId(), ex.getMessage(), ex);
        }
    }
}
