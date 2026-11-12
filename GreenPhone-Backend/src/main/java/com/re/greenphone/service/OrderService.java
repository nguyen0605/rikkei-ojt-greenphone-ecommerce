package com.re.greenphone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderCreationResult;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final com.re.greenphone.repository.OrderHistoryRepository orderHistoryRepository;
    private final UserRepository userRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final PromotionRepository promotionRepository;
    private final CartRepository cartRepository;
    private final OrderMapper orderMapper;
    private final EmailService emailService;
    private final SettingsService settingsService;
    private final InventoryStockHistoryService inventoryStockHistoryService;
    private final WarehouseRoutingService warehouseRoutingService;
    private final WarehouseTransferService warehouseTransferService;
    private final jakarta.persistence.EntityManager entityManager;
    private final RedisTemplate<String, Object> redisTemplate;

    public OrderCreationResult createOrderWithIdempotency(OrderRequest request, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            OrderDTO order = executeCreateOrder(request);
            return new OrderCreationResult(order, true);
        }

        String redisKey = "idempotency:" + idempotencyKey.trim();

        // 1. Sử dụng Redis SETNX: lưu trạng thái key trong 60 giây
        Boolean acquired = Boolean.FALSE;
        try {
            acquired = redisTemplate.opsForValue().setIfAbsent(redisKey, "PROCESSING", 60, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis không khả dụng khi kiểm tra idempotency key {}: {}", redisKey, e.getMessage());
            OrderDTO order = executeCreateOrder(request);
            return new OrderCreationResult(order, true);
        }

        if (Boolean.TRUE.equals(acquired)) {
            // Request đầu tiên nhận được lock: Xử lý tạo đơn hàng
            try {
                OrderDTO order = executeCreateOrder(request);
                try {
                    redisTemplate.opsForValue().set(redisKey, order, 60, TimeUnit.SECONDS);
                } catch (Exception ex) {
                    log.warn("Không thể lưu cache đơn hàng cho key {}: {}", redisKey, ex.getMessage());
                }
                return new OrderCreationResult(order, true);
            } catch (Exception e) {
                // QUY TẮC: CẤM giữ khóa vĩnh viễn nếu request gặp lỗi không mong muốn
                try {
                    redisTemplate.delete(redisKey);
                } catch (Exception ex) {
                    log.warn("Không thể xóa idempotency key {} sau khi gặp lỗi: {}", redisKey, ex.getMessage());
                }
                throw e;
            }
        } else {
            // Request trùng lặp: Đọc đơn hàng đã tạo hoặc chờ request đầu tiên hoàn tất
            OrderDTO existingOrder = waitForExistingOrder(redisKey);
            if (existingOrder != null) {
                log.info("Phát hiện request trùng lặp idempotency key {}. Trả về đơn hàng #{} đã tạo", redisKey, existingOrder.getId());
                return new OrderCreationResult(existingOrder, false);
            }
            throw new ConflictException("Đơn hàng đang được xử lý, vui lòng chờ trong giây lát");
        }
    }

    public OrderDTO createOrder(OrderRequest request) {
        return createOrderWithIdempotency(request, null).getOrder();
    }

    private OrderDTO executeCreateOrder(OrderRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Calculate total
        BigDecimal total = BigDecimal.ZERO;
        Order order = Order.builder()
                .user(user)
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .shippingAddress(request.getShippingAddress())
                .paymentMethod(request.getPaymentMethod())
                .note(request.getNote())
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .discountAmount(BigDecimal.ZERO)
                .build();

        // Process items under pessimistic lock per variant — concurrent orders
        // serialize on the row lock, so stock is never decremented twice and no retry is needed.
        // Sort items by phoneVariantId to strictly prevent deadlocks when locking multiple rows.
        var sortedItems = request.getItems().stream()
                .sorted(java.util.Comparator.comparing(com.re.greenphone.dto.request.OrderItemRequest::getPhoneVariantId))
                .toList();

        // 1. Lock all variants first in sorted order
        List<PhoneVariant> lockedVariants = new java.util.ArrayList<>();
        for (var itemReq : sortedItems) {
            PhoneVariant variant = phoneVariantRepository.findByIdWithLock(itemReq.getPhoneVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", itemReq.getPhoneVariantId()));

            if ("INACTIVE".equalsIgnoreCase(variant.getStatus())
                    || (variant.getPhone() != null && "INACTIVE".equalsIgnoreCase(variant.getPhone().getStatus()))) {
                throw new BadRequestException("Product variant " + variant.getId() + " is inactive");
            }

            if (variant.getStockQuantity() != null && variant.getStockQuantity() < itemReq.getQuantity()) {
                throw new BadRequestException("Insufficient stock for variant " + variant.getId());
            }
            lockedVariants.add(variant);
        }

        // 2. Route inventory: Direct fulfillment (Case 1) or Inter-warehouse transfer plan (Case 2)
        List<com.re.greenphone.dto.request.OrderItemRequirement> itemRequirements = sortedItems.stream()
                .map(item -> new com.re.greenphone.dto.request.OrderItemRequirement(item.getPhoneVariantId(), item.getQuantity()))
                .toList();

        com.re.greenphone.dto.response.InterWarehouseTransferPlan transferPlan = warehouseRoutingService.routeInterWarehouseFulfillment(
                request.getLatitude(),
                request.getLongitude(),
                itemRequirements
        );

        if (!transferPlan.isFeasible()) {
            throw new BadRequestException("Tổng tồn kho toàn hệ thống không đủ để đáp ứng đơn hàng");
        }

        Warehouse routedWarehouse = transferPlan.getDestinationWarehouse();
        order.setFulfillmentWarehouse(routedWarehouse);
        boolean isDirect = transferPlan.isDirectFulfillment();

        if (!isDirect) {
            order.setOrderStatus("WAITING_FOR_TRANSFER");
        }

        // 3. Process items: decrement stock at routed warehouse and build order details
        for (int i = 0; i < sortedItems.size(); i++) {
            var itemReq = sortedItems.get(i);
            PhoneVariant variant = lockedVariants.get(i);

            // Giảm tồn kho:
            // Case 1 (Direct): Trừ trực tiếp tại kho routedWarehouse
            // Case 2 (Transfer): Giảm tổng aggregate PhoneVariant.stockQuantity và ghi log xuất hàng chờ gom
            if (variant.getStockQuantity() != null) {
                int quantityBefore = variant.getStockQuantity();
                variant.setStockQuantity(quantityBefore - itemReq.getQuantity());
                if (isDirect) {
                    inventoryStockHistoryService.recordAtWarehouse(variant, quantityBefore, -itemReq.getQuantity(), "EXPORT", "Đặt hàng", routedWarehouse.getId());
                } else {
                    inventoryStockHistoryService.recordAggregateOnly(variant, quantityBefore, -itemReq.getQuantity(), "EXPORT", "Đặt hàng (chờ gom hàng liên kho)");
                }
            }

            BigDecimal price = variant.getDiscountPrice() != null ? variant.getDiscountPrice() : variant.getPrice();
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(subtotal);

            Phone phone = variant.getPhone();
            String productName = phone != null ? phone.getName() : "Phone";
            String ramVal = variant.getRamItem() != null ? variant.getRamItem().getValue() : "";
            String storageVal = variant.getStorageItem() != null ? variant.getStorageItem().getValue() : "";
            String colorVal = variant.getColorItem() != null ? variant.getColorItem().getValue() : "";

            OrderDetail detail = OrderDetail.builder()
                    .warehouseId(routedWarehouse.getId())
                    .order(order)
                    .phoneVariant(variant)
                    .productName(productName)
                    .ram(ramVal)
                    .storage(storageVal)
                    .color(colorVal)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(price)
                    .subtotal(subtotal)
                    .build();
            order.getOrderDetails().add(detail);
        }

        // Apply promotion
        if (request.getUserPromotionId() != null) {
            UserPromotion up = userPromotionRepository.findById(request.getUserPromotionId())
                    .orElseThrow(() -> new ResourceNotFoundException("UserPromotion", "id", request.getUserPromotionId()));

            // Chống IDOR: Chỉ chủ sở hữu mới được dùng voucher này
            if (up.getUser() == null || !up.getUser().getId().equals(userId)) {
                throw new BadRequestException("Mã khuyến mãi không thuộc sở hữu của bạn");
            }

            if (!"AVAILABLE".equals(up.getStatus())) {
                throw new BadRequestException("Mã khuyến mãi không còn khả dụng");
            }

            Promotion promo = up.getPromotion();
            LocalDateTime now = LocalDateTime.now();

            if (!"ACTIVE".equals(promo.getStatus())
                    || (promo.getStartDate() != null && promo.getStartDate().isAfter(now))
                    || (promo.getEndDate() != null && promo.getEndDate().isBefore(now))) {
                throw new BadRequestException("Chương trình khuyến mãi đã hết hạn hoặc không còn hiệu lực");
            }

            BigDecimal minOrder = promo.getMinOrderValue();
            if (minOrder != null && total.compareTo(minOrder) < 0) {
                throw new BadRequestException("Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng mã khuyến mãi");
            }

            BigDecimal discount = calculateDiscount(total, promo);
            order.setUserPromotion(up);
            order.setDiscountAmount(discount);
            up.setStatus("USED");
            up.setUsedAt(now);
            userPromotionRepository.save(up);

            int currentUsed = promo.getUsedQuantity() != null ? promo.getUsedQuantity() : 0;
            promo.setUsedQuantity(currentUsed + 1);
            promotionRepository.save(promo);
        }

        order.setTotalAmount(total);
        BigDecimal finalAmount = total.subtract(order.getDiscountAmount());

        // Shipping fee: free above threshold, else fixed fee (from settings)
        BigDecimal shippingFee = settingsService.getShippingFee();
        BigDecimal freeThreshold = settingsService.getFreeShippingThreshold();
        BigDecimal actualShippingFee = BigDecimal.ZERO;
        if (shippingFee.signum() > 0
                && (freeThreshold.signum() <= 0 || finalAmount.compareTo(freeThreshold) < 0)) {
            actualShippingFee = shippingFee;
            finalAmount = finalAmount.add(shippingFee);
        }

        order.setShippingFee(actualShippingFee);
        order.setFinalAmount(finalAmount);

        order = orderRepository.save(order);

        if (!isDirect) {
            warehouseTransferService.createTransfersForOrder(order, transferPlan);
        }

        String initialOrderNote = isDirect
                ? "Đơn hàng được khởi tạo thành công (" + order.getPaymentMethod() + ")"
                : "Đơn hàng được khởi tạo thành công - Đang chờ điều chuyển hàng liên kho về " + routedWarehouse.getName() + " (" + order.getPaymentMethod() + ")";

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(null)
                .toStatus(order.getOrderStatus())
                .note(initialOrderNote)
                .changedBy(user.getFullName() != null ? user.getFullName() : "CUSTOMER")
                .build());

        // Clear cart only for normal checkout; Buy Now orders only pay for the selected item(s)
        if (!Boolean.TRUE.equals(request.getBuyNow())) {
            cartRepository.findByUserId(userId).ifPresent(cart -> {
                cart.getCartItems().clear();
                cartRepository.save(cart);
            });
        }

        // Confirmation email:
        // - COD: confirmed at creation.
        // - Bank transfer (VIETQR): only when the payment is confirmed via the
        //   Sepay webhook — sending it here would reach the user before they pay.
        if (!"VIETQR".equalsIgnoreCase(request.getPaymentMethod())) {
            emailService.sendOrderConfirmation(user.getEmail(), String.valueOf(order.getId()));
        }

        return orderMapper.toDto(order);
    }

    private OrderDTO waitForExistingOrder(String redisKey) {
        int maxAttempts = 30; // 30 * 100ms = 3 giây
        for (int i = 0; i < maxAttempts; i++) {
            try {
                Object cached = redisTemplate.opsForValue().get(redisKey);
                if (cached != null && !"PROCESSING".equals(cached)) {
                    OrderDTO dto = convertToOrderDto(cached);
                    if (dto != null) {
                        return dto;
                    }
                }
                if (cached == null) {
                    return null;
                }
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Lỗi khi đọc idempotency key từ Redis {}: {}", redisKey, e.getMessage());
                break;
            }
        }
        return null;
    }

    private OrderDTO convertToOrderDto(Object cached) {
        if (cached instanceof OrderDTO dto) {
            return dto;
        }
        if (cached instanceof java.util.Map<?, ?> map) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                mapper.registerModule(new JavaTimeModule());
                return mapper.convertValue(map, OrderDTO.class);
            } catch (Exception e) {
                log.warn("Không thể parse dữ liệu cached sang OrderDTO: {}", e.getMessage());
            }
        }
        if (cached instanceof Number num) {
            return orderRepository.findById(num.longValue())
                    .map(orderMapper::toDto)
                    .orElse(null);
        }
        return null;
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getOrders(PageRequest pageRequest) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> page = orderRepository.findByUserId(userId, pageable);
        List<OrderDTO> dtos = orderMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Transactional(readOnly = true)
    public OrderDTO getOrderDetail(Long orderId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot view another user's order");
        }

        return orderMapper.toDto(order);
    }

    public OrderDTO cancelOrder(Long orderId) {
        return cancelOrder(orderId, (com.re.greenphone.dto.request.CancelOrderRequest) null);
    }

    public OrderDTO cancelOrder(Long orderId, String reason) {
        return cancelOrder(orderId, com.re.greenphone.dto.request.CancelOrderRequest.builder().reason(reason).build());
    }

    public OrderDTO cancelOrder(Long orderId, com.re.greenphone.dto.request.CancelOrderRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot cancel another user's order");
        }

        if (!List.of("PENDING", "CONFIRMED", "WAITING_FOR_TRANSFER").contains(order.getOrderStatus())) {
            throw new BadRequestException("Order cannot be cancelled at current status: " + order.getOrderStatus());
        }

        boolean wasWaitingForTransfer = "WAITING_FOR_TRANSFER".equals(order.getOrderStatus());

        // Restore stock (pessimistic lock per variant — no double-restore with concurrent cancels)
        // Sort details by phoneVariantId to strictly prevent deadlocks.
        var sortedDetails = order.getOrderDetails().stream()
                .filter(d -> d.getPhoneVariant() != null)
                .sorted(java.util.Comparator.comparing(d -> d.getPhoneVariant().getId()))
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
                    inventoryStockHistoryService.recordAggregateOnly(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hủy đơn hàng chờ điều chuyển");
                } else if (detail.getWarehouseId() == null) {
                    inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hủy đơn hàng");
                } else {
                    inventoryStockHistoryService.recordAtWarehouse(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hủy đơn hàng", detail.getWarehouseId());
                }
                phoneVariantRepository.save(locked);
            }
        }

        if (wasWaitingForTransfer) {
            String cancelReason = request != null ? request.getReason() : null;
            warehouseTransferService.cancelTransfersForOrder(order.getId(), cancelReason);
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

            // Gỡ liên kết userPromotion khỏi đơn đã hủy để giải phóng khóa UNIQUE và trả lại voucher
            order.setUserPromotion(null);
        }

        order.setOrderStatus("CANCELLED");

        // Nếu đơn hàng đã thanh toán trước (PAID), chuyển paymentStatus sang REFUND_PENDING
        boolean isPaid = "PAID".equalsIgnoreCase(order.getPaymentStatus());
        String reason = request != null ? request.getReason() : null;

        if (isPaid && reason != null && (reason.trim().equalsIgnoreCase("Lý do khác") || reason.trim().isEmpty())) {
            throw new BadRequestException("Đối với đơn hàng đã thanh toán, vui lòng nhập chi tiết lý do hủy đơn");
        }

        if (isPaid) {
            order.setPaymentStatus("REFUND_PENDING");
        }
        StringBuilder noteBuilder = new StringBuilder();
        if (order.getNote() != null && !order.getNote().trim().isEmpty()) {
            noteBuilder.append(order.getNote().trim()).append(" ");
        }
        if (reason != null && !reason.trim().isEmpty()) {
            noteBuilder.append("[Lý do hủy: ").append(reason.trim()).append("]");
        }
        if (isPaid && request != null && request.getAccountNumber() != null && !request.getAccountNumber().trim().isEmpty()) {
            noteBuilder.append(String.format(" [YÊU CẦU HOÀN TIỀN: Ngân hàng: %s | STK: %s | Chủ TK: %s]",
                    request.getBankName() != null ? request.getBankName().trim() : "N/A",
                    request.getAccountNumber().trim(),
                    request.getAccountHolder() != null ? request.getAccountHolder().trim() : "N/A"));
        }

        if (noteBuilder.length() > 0) {
            order.setNote(noteBuilder.toString().trim());
        }

        String previousStatus = order.getOrderStatus();
        order.setOrderStatus("CANCELLED");
        order = orderRepository.save(order);

        orderHistoryRepository.save(com.re.greenphone.entity.OrderHistory.builder()
                .order(order)
                .fromStatus(previousStatus)
                .toStatus("CANCELLED")
                .note(reason != null && !reason.isBlank() ? reason.trim() : "Khách hàng hủy đơn")
                .changedBy(order.getUser() != null ? order.getUser().getFullName() : "CUSTOMER")
                .build());

        return orderMapper.toDto(order);
    }

    public OrderDTO applyPromotionToOrder(Long orderId, Long userPromotionId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // 1. Chống IDOR: Chỉ chủ sở hữu đơn hàng mới được gắn mã
        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền chỉnh sửa đơn hàng của người khác");
        }

        if (!"PENDING".equals(order.getOrderStatus())) {
            throw new BadRequestException("Chỉ có thể áp dụng mã khuyến mãi cho đơn hàng đang chờ xử lý");
        }

        UserPromotion up = userPromotionRepository.findById(userPromotionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserPromotion", "id", userPromotionId));

        // 2. Chống IDOR: Chỉ chủ sở hữu mã mới được sử dụng
        if (up.getUser() == null || !up.getUser().getId().equals(userId)) {
            throw new BadRequestException("Mã khuyến mãi không thuộc sở hữu của bạn");
        }

        // 3. Kiểm tra trạng thái khả dụng
        if (!"AVAILABLE".equals(up.getStatus())) {
            throw new BadRequestException("Mã khuyến mãi không còn khả dụng");
        }

        Promotion promo = up.getPromotion();
        LocalDateTime now = LocalDateTime.now();

        // 4. Kiểm tra thời hạn và trạng thái chiến dịch
        if (!"ACTIVE".equals(promo.getStatus())
                || (promo.getStartDate() != null && promo.getStartDate().isAfter(now))
                || (promo.getEndDate() != null && promo.getEndDate().isBefore(now))) {
            throw new BadRequestException("Chương trình khuyến mãi đã hết hạn hoặc không còn hiệu lực");
        }

        // 5. Kiểm tra giá trị đơn hàng tối thiểu
        BigDecimal minOrder = promo.getMinOrderValue();
        if (minOrder != null && order.getTotalAmount().compareTo(minOrder) < 0) {
            throw new BadRequestException("Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng mã khuyến mãi");
        }

        // 6. Hoàn lại voucher cũ nếu đơn hàng đã gắn voucher khác trước đó
        if (order.getUserPromotion() != null && !order.getUserPromotion().getId().equals(up.getId())) {
            UserPromotion oldUp = order.getUserPromotion();
            Promotion oldPromo = oldUp.getPromotion();
            if (oldPromo != null && "ACTIVE".equals(oldPromo.getStatus())
                    && (oldPromo.getEndDate() == null || oldPromo.getEndDate().isAfter(now))) {
                oldUp.setStatus("AVAILABLE");
            } else {
                oldUp.setStatus("EXPIRED");
            }
            oldUp.setUsedAt(null);
            userPromotionRepository.save(oldUp);

            if (oldPromo != null && oldPromo.getUsedQuantity() != null && oldPromo.getUsedQuantity() > 0) {
                oldPromo.setUsedQuantity(oldPromo.getUsedQuantity() - 1);
                promotionRepository.save(oldPromo);
            }
        }

        BigDecimal discount = calculateDiscount(order.getTotalAmount(), promo);
        order.setUserPromotion(up);
        order.setDiscountAmount(discount);

        // 7. Tính lại finalAmount chuẩn xác bao gồm cả phí vận chuyển
        BigDecimal finalAmount = order.getTotalAmount().subtract(discount);
        BigDecimal shippingFee = settingsService.getShippingFee();
        BigDecimal freeThreshold = settingsService.getFreeShippingThreshold();
        BigDecimal actualShippingFee = BigDecimal.ZERO;
        if (shippingFee.signum() > 0
                && (freeThreshold.signum() <= 0 || finalAmount.compareTo(freeThreshold) < 0)) {
            actualShippingFee = shippingFee;
            finalAmount = finalAmount.add(shippingFee);
        }
        order.setShippingFee(actualShippingFee);
        order.setFinalAmount(finalAmount);

        up.setStatus("USED");
        up.setUsedAt(now);
        userPromotionRepository.save(up);

        int currentUsed = promo.getUsedQuantity() != null ? promo.getUsedQuantity() : 0;
        promo.setUsedQuantity(currentUsed + 1);
        promotionRepository.save(promo);

        order = orderRepository.save(order);
        return orderMapper.toDto(order);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDTO> getOrderHistory(PageRequest pageRequest) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> page = orderRepository.findByUserIdAndOrderStatus(userId, "DELIVERED", pageable);
        List<OrderDTO> dtos = orderMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    private BigDecimal calculateDiscount(BigDecimal total, Promotion promo) {
        BigDecimal discount;
        if ("PERCENT".equals(promo.getDiscountType())) {
            BigDecimal rate = promo.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            discount = total.multiply(rate).setScale(0, RoundingMode.HALF_UP);
        } else {
            discount = promo.getDiscountValue();
        }

        // Cap at max discount
        if (promo.getMaxDiscountAmount() != null && discount.compareTo(promo.getMaxDiscountAmount()) > 0) {
            discount = promo.getMaxDiscountAmount();
        }

        // Discount cannot exceed total
        if (discount.compareTo(total) > 0) {
            discount = total;
        }

        return discount;
    }
}
