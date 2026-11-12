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
            "PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED"
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
    private final com.re.greenphone.service.WarrantyService warrantyService;
    private final jakarta.persistence.EntityManager entityManager;

    private boolean isValidTransition(String current, String next) {
        if (current == null || next == null) return false;
        if (current.equals(next)) return true;

        return switch (current) {
            case "PENDING" -> "CONFIRMED".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "CONFIRMED" -> "PROCESSING".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "PROCESSING" -> "SHIPPING".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "SHIPPING" -> "DELIVERED".equals(next) || "CANCELLED".equals(next) || "COMPLETED".equals(next);
            case "DELIVERED" -> "COMPLETED".equals(next);
            case "CANCELLED", "COMPLETED" -> false; // Terminal states
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

        String currentStatus = order.getOrderStatus();
        if (!isValidTransition(currentStatus, status)) {
            throw new BadRequestException(
                    String.format("Vi phạm quy trình: Không thể chuyển trạng thái đơn hàng từ %s sang %s", currentStatus, status));
        }

        if (currentStatus.equals(status)) {
            return orderMapper.toDto(order);
        }

        if ("CANCELLED".equals(status)) {
            // Restore stock (pessimistic lock per variant — no double-restore)
            for (var detail : order.getOrderDetails()) {
                PhoneVariant variant = detail.getPhoneVariant();
                if (variant != null && variant.getStockQuantity() != null) {
                    PhoneVariant locked = phoneVariantRepository.findByIdWithLock(variant.getId())
                            .orElse(variant);
                    entityManager.refresh(locked, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                    int quantityBefore = locked.getStockQuantity();
                    locked.setStockQuantity(quantityBefore + detail.getQuantity());
                    if (detail.getWarehouseId() == null) {
                        inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Admin hủy đơn hàng");
                    } else {
                        inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Admin hủy đơn hàng", detail.getWarehouseId());
                    }
                    phoneVariantRepository.save(locked);
                }
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

        if (!List.of("UNPAID", "PAID", "REFUND_PENDING", "REFUNDED").contains(paymentStatus)) {
            throw new BadRequestException("Trạng thái thanh toán không hợp lệ: " + paymentStatus);
        }

        String previousPaymentStatus = order.getPaymentStatus();
        if ("REFUNDED".equalsIgnoreCase(paymentStatus)) {
            String existingNote = order.getNote() != null ? order.getNote().trim() : "";
            String refundTag = "[Kế toán đã hoàn tiền thành công lúc " + java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(LocalDateTime.now()) + "]";
            if (!existingNote.contains("[Kế toán đã hoàn tiền")) {
                order.setNote(existingNote.isEmpty() ? refundTag : existingNote + " " + refundTag);
            }
        }

        order.setPaymentStatus(paymentStatus);
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(previousPaymentStatus)
                .toStatus(paymentStatus)
                .note("REFUNDED".equalsIgnoreCase(paymentStatus) ? "Kế toán đã hoàn tiền thành công" : "Cập nhật trạng thái thanh toán sang " + paymentStatus)
                .changedBy("ADMIN")
                .build());

        return orderMapper.toDto(order);
    }

    public OrderDTO confirmOrder(Long id) {
        return updateStatus(id, "CONFIRMED");
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
}
