package com.re.greenphone.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.ReturnCreateRequest;
import com.re.greenphone.dto.request.ReturnReviewRequest;
import com.re.greenphone.dto.response.ReturnResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.enums.OrderStatus;
import com.re.greenphone.enums.PaymentStatus;
import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.enums.ReturnType;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final RefundRepository refundRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final ShipmentRepository shipmentRepository;
    private final WarrantyRepository warrantyRepository;
    private final UserRepository userRepository;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final ObjectMapper objectMapper;

    /**
     * Khách hàng gửi yêu cầu đổi trả sản phẩm lỗi trong 7 ngày
     */
    @Transactional
    public ReturnResponse createReturnRequest(ReturnCreateRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUser().getId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        // 1. Kiểm tra đơn hàng tồn tại
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        // Kiểm tra quyền sở hữu đơn hàng
        if (order.getUser() == null || !order.getUser().getId().equals(currentUserId)) {
            throw new BadRequestException("Bạn không có quyền thực hiện yêu cầu đổi trả trên đơn hàng này");
        }

        // 2. Validate trạng thái đơn hàng: BẮT BUỘC COMPLETED
        if (!OrderStatus.COMPLETED.name().equalsIgnoreCase(order.getOrderStatus())) {
            throw new BadRequestException("Chỉ đơn hàng đã giao thành công (COMPLETED) mới đủ điều kiện đổi trả");
        }

        // 3. Kiểm tra biến thể điện thoại có trong chi tiết đơn hàng không (Null-safe check)
        OrderDetail orderDetail = orderDetailRepository.findByOrderId(order.getId()).stream()
                .filter(od -> od.getPhoneVariant() != null && od.getPhoneVariant().getId().equals(request.getPhoneVariantId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Sản phẩm không thuộc đơn hàng được chỉ định"));

        // 4. Validate điều kiện thời gian: không quá 7 ngày kể từ ngày nhận hàng
        validateWithin7Days(order);

        // 5. Kiểm tra xem sản phẩm này đã có yêu cầu đổi trả đang chờ hoặc đã duyệt chưa
        boolean alreadyPending = returnRequestRepository.existsByOrderIdAndPhoneVariantIdAndStatusIn(
                order.getId(),
                request.getPhoneVariantId(),
                List.of(ReturnStatus.PENDING, ReturnStatus.APPROVED, ReturnStatus.COMPLETED)
        );
        if (alreadyPending) {
            throw new BadRequestException("Sản phẩm này đã có yêu cầu đổi trả đang được xử lý hoặc đã hoàn tất");
        }

        // Chuẩn bị thông tin request
        ReturnType returnType = request.getType() != null ? request.getType() : ReturnType.EXCHANGE;
        BigDecimal refundAmount = BigDecimal.ZERO;
        if (returnType == ReturnType.REFUND) {
            refundAmount = orderDetail.getUnitPrice() != null ? orderDetail.getUnitPrice() : BigDecimal.ZERO;
        }

        String imagesJson = serializeProofImages(request.getProofImages());
        String returnCode = "RET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        ReturnRequest returnRequest = ReturnRequest.builder()
                .returnCode(returnCode)
                .order(order)
                .phoneVariant(orderDetail.getPhoneVariant())
                .user(currentUser)
                .reason(request.getReason())
                .errorDescription(request.getErrorDescription())
                .proofImagesJson(imagesJson)
                .type(returnType)
                .status(ReturnStatus.PENDING)
                .refundAmount(refundAmount)
                .build();

        ReturnRequest saved = returnRequestRepository.save(returnRequest);
        log.info("Created return request: code={}, type={}, orderId={}", returnCode, returnType, order.getId());

        return mapToResponse(saved);
    }

    /**
     * Admin duyệt yêu cầu đổi trả:
     * - EXCHANGE: Khóa bi quan và trừ tồn kho 1 máy mới, ghi log lịch sử kho, hủy bảo hành cũ & tạo bảo hành mới.
     * - REFUND: Tạo bản ghi Refund, đổi trạng thái đơn sang REFUNDED.
     */
    @Transactional
    public ReturnResponse approveReturn(Long returnId, ReturnReviewRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRequest", "id", returnId));

        if (returnRequest.getStatus() != ReturnStatus.PENDING) {
            throw new BadRequestException("Yêu cầu này đã được xử lý (trạng thái hiện tại: " + returnRequest.getStatus() + ")");
        }

        Long adminId = SecurityUtils.getCurrentUser().getId();
        User adminUser = userRepository.findById(adminId).orElse(null);

        Order order = returnRequest.getOrder();
        PhoneVariant variant = returnRequest.getPhoneVariant();

        if (returnRequest.getType() == ReturnType.EXCHANGE) {
            // 1. Khóa bi quan (Pessimistic Lock) và trừ tồn kho 1 máy mới
            PhoneVariant lockedVariant = phoneVariantRepository.findByIdWithLock(variant.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variant.getId()));

            int currentStock = lockedVariant.getStockQuantity() != null ? lockedVariant.getStockQuantity() : 0;
            if (currentStock < 1) {
                throw new BadRequestException("Kho hàng đã hết số lượng biến thể máy này để thực hiện đổi mới");
            }

            int newStock = currentStock - 1;
            lockedVariant.setStockQuantity(newStock);
            phoneVariantRepository.save(lockedVariant);

            // Ghi nhận lịch sử xuất kho (EXPORT)
            String adminName = adminUser != null ? adminUser.getFullName() : "Admin";
            inventoryStockHistoryService.record(
                    lockedVariant,
                    currentStock,
                    -1,
                    "EXPORT",
                    "Đổi mới sản phẩm lỗi theo yêu cầu " + returnRequest.getReturnCode(),
                    adminId,
                    adminName
            );

            // Cập nhật bảo hành: Hủy hiệu lực bảo hành cũ (VOIDED) & Cấp bảo hành mới
            updateWarrantyForExchange(order, lockedVariant, request != null ? request.getNewImeiNumber() : null);

        } else if (returnRequest.getType() == ReturnType.REFUND) {
            // 2. Xử lý hoàn tiền
            BigDecimal amountToRefund = returnRequest.getRefundAmount();
            if (amountToRefund == null || amountToRefund.compareTo(BigDecimal.ZERO) <= 0) {
                amountToRefund = order.getFinalAmount() != null ? order.getFinalAmount() : order.getTotalAmount();
            }

            String refundCode = "REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String paymentMethod = order.getPaymentMethod() != null ? order.getPaymentMethod() : "OTHER";

            Refund refund = Refund.builder()
                    .refundCode(refundCode)
                    .order(order)
                    .returnRequest(returnRequest)
                    .amount(amountToRefund)
                    .paymentMethod(paymentMethod)
                    .status("COMPLETED")
                    .reason("Hoàn tiền đơn hàng theo yêu cầu đổi trả " + returnRequest.getReturnCode())
                    .transactionRef("TRX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                    .refundedAt(LocalDateTime.now())
                    .build();

            refundRepository.save(refund);

            // Chuyển trạng thái đơn hàng sang REFUNDED
            order.setOrderStatus(OrderStatus.REFUNDED.name());
            order.setPaymentStatus(PaymentStatus.REFUNDED.name());
            orderRepository.save(order);

            // Vô hiệu hóa bảo hành cũ của sản phẩm này
            voidOldWarranty(order.getId(), variant.getId(), "Đã hoàn tiền theo yêu cầu " + returnRequest.getReturnCode());
        }

        returnRequest.setStatus(ReturnStatus.APPROVED);
        returnRequest.setAdminNote(request != null ? request.getAdminNote() : null);
        returnRequest.setReviewedBy(adminUser);
        returnRequest.setReviewedAt(LocalDateTime.now());

        ReturnRequest updated = returnRequestRepository.save(returnRequest);
        log.info("Approved return request: code={}, type={}", updated.getReturnCode(), updated.getType());

        return mapToResponse(updated);
    }

    /**
     * Admin từ chối yêu cầu đổi trả
     */
    @Transactional
    public ReturnResponse rejectReturn(Long returnId, ReturnReviewRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRequest", "id", returnId));

        if (returnRequest.getStatus() != ReturnStatus.PENDING) {
            throw new BadRequestException("Yêu cầu này đã được xử lý (trạng thái: " + returnRequest.getStatus() + ")");
        }

        Long adminId = SecurityUtils.getCurrentUser().getId();
        User adminUser = userRepository.findById(adminId).orElse(null);

        returnRequest.setStatus(ReturnStatus.REJECTED);
        returnRequest.setAdminNote(request != null ? request.getAdminNote() : null);
        returnRequest.setReviewedBy(adminUser);
        returnRequest.setReviewedAt(LocalDateTime.now());

        ReturnRequest updated = returnRequestRepository.save(returnRequest);
        log.info("Rejected return request: code={}", updated.getReturnCode());

        return mapToResponse(updated);
    }

    /**
     * Lấy danh sách yêu cầu đổi trả của người dùng hiện tại
     */
    @Transactional(readOnly = true)
    public List<ReturnResponse> getMyReturnRequests() {
        Long currentUserId = SecurityUtils.getCurrentUser().getId();
        return returnRequestRepository.findByUserIdOrderByCreatedAtDesc(currentUserId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Admin lấy danh sách yêu cầu đổi trả có phân trang
     */
    @Transactional(readOnly = true)
    public Page<ReturnResponse> getAdminReturnRequests(ReturnStatus status, Pageable pageable) {
        Page<ReturnRequest> page;
        if (status != null) {
            page = returnRequestRepository.findByStatus(status, pageable);
        } else {
            page = returnRequestRepository.findAll(pageable);
        }
        return page.map(this::mapToResponse);
    }

    /**
     * Lấy chi tiết yêu cầu đổi trả (Bảo mật chống IDOR / BOLA)
     */
    @Transactional(readOnly = true)
    public ReturnResponse getReturnDetail(Long returnId) {
        ReturnRequest returnRequest = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRequest", "id", returnId));

        Long currentUserId = SecurityUtils.getCurrentUser().getId();
        String currentRole = SecurityUtils.getCurrentUserRole();
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(currentRole);

        if (!isAdmin && (returnRequest.getUser() == null || !returnRequest.getUser().getId().equals(currentUserId))) {
            throw new ForbiddenException("Bạn không có quyền xem chi tiết yêu cầu đổi trả này");
        }

        return mapToResponse(returnRequest);
    }

    /**
     * Kiểm tra điều kiện thời gian: không quá 7 ngày kể từ khi nhận hàng
     */
    private void validateWithin7Days(Order order) {
        LocalDateTime deliveryDate = null;

        // Ưu tiên lấy từ Shipment có trạng thái DELIVERED
        List<Shipment> shipments = shipmentRepository.findByOrderId(order.getId());
        for (Shipment s : shipments) {
            if ("DELIVERED".equalsIgnoreCase(s.getStatus()) && s.getDeliveredAt() != null) {
                deliveryDate = s.getDeliveredAt();
                break;
            }
        }

        // Fallback sang updated_at của order nếu chưa có deliveredAt trong shipment
        if (deliveryDate == null) {
            deliveryDate = order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt();
        }

        if (deliveryDate == null) {
            deliveryDate = LocalDateTime.now();
        }

        LocalDateTime deadline = deliveryDate.plusDays(7);
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new BadRequestException("Đơn hàng đã vượt quá thời hạn 7 ngày đổi trả kể từ ngày nhận hàng ("
                    + deliveryDate.toLocalDate() + ")");
        }
    }

    private void updateWarrantyForExchange(Order order, PhoneVariant variant, String newImei) {
        // Vô hiệu bảo hành cũ
        voidOldWarranty(order.getId(), variant.getId(), "Đổi sản phẩm mới do lỗi nhà sản xuất");

        // Tạo bảo hành mới
        String resolvedImei = (newImei != null && !newImei.isBlank())
                ? newImei
                : "IMEI-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        LocalDateTime now = LocalDateTime.now();
        Warranty newWarranty = Warranty.builder()
                .order(order)
                .phoneVariant(variant)
                .imeiNumber(resolvedImei)
                .customerName(order.getReceiverName() != null ? order.getReceiverName() : "Khách hàng")
                .customerPhone(order.getReceiverPhone() != null ? order.getReceiverPhone() : "")
                .startDate(now)
                .endDate(now.plusMonths(12)) // Bảo hành 12 tháng từ ngày đổi mới
                .status("ACTIVE")
                .note("Cấp mới từ đổi trả sản phẩm lỗi")
                .build();

        warrantyRepository.save(newWarranty);
    }

    private void voidOldWarranty(Long orderId, Long variantId, String reason) {
        List<Warranty> warranties = warrantyRepository.findByOrderId(orderId);
        for (Warranty w : warranties) {
            if (w.getPhoneVariant() != null && w.getPhoneVariant().getId().equals(variantId)
                    && "ACTIVE".equalsIgnoreCase(w.getStatus())) {
                w.setStatus("VOIDED");
                w.setNote(w.getNote() != null ? w.getNote() + " | " + reason : reason);
                warrantyRepository.save(w);
            }
        }
    }

    private String serializeProofImages(List<String> images) {
        if (images == null || images.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(images);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize proof images", e);
            return "[]";
        }
    }

    private List<String> deserializeProofImages(String json) {
        if (json == null || json.isBlank() || "[]".equals(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize proof images JSON: {}", json);
            return Collections.emptyList();
        }
    }

    private ReturnResponse mapToResponse(ReturnRequest req) {
        List<String> images = deserializeProofImages(req.getProofImagesJson());
        return ReturnResponse.builder()
                .id(req.getId())
                .returnCode(req.getReturnCode())
                .orderId(req.getOrder() != null ? req.getOrder().getId() : null)
                .phoneVariantId(req.getPhoneVariant() != null ? req.getPhoneVariant().getId() : null)
                .phoneName(req.getPhoneVariant() != null && req.getPhoneVariant().getPhone() != null
                        ? req.getPhoneVariant().getPhone().getName() : null)
                .variantSku(req.getPhoneVariant() != null ? req.getPhoneVariant().getSku() : null)
                .userId(req.getUser() != null ? req.getUser().getId() : null)
                .customerName(req.getUser() != null ? req.getUser().getFullName() : null)
                .reason(req.getReason())
                .errorDescription(req.getErrorDescription())
                .proofImages(images)
                .type(req.getType())
                .status(req.getStatus())
                .refundAmount(req.getRefundAmount())
                .adminNote(req.getAdminNote())
                .reviewedBy(req.getReviewedBy() != null ? req.getReviewedBy().getId() : null)
                .reviewerName(req.getReviewedBy() != null ? req.getReviewedBy().getFullName() : null)
                .reviewedAt(req.getReviewedAt())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
