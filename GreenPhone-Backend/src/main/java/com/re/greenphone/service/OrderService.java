package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.OrderRequest;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final PromotionRepository promotionRepository;
    private final CartRepository cartRepository;
    private final OrderMapper orderMapper;
    private final EmailService emailService;
    private final SettingsService settingsService;
    private final InventoryStockHistoryService inventoryStockHistoryService;

    public OrderDTO createOrder(OrderRequest request) {
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
        for (var itemReq : request.getItems()) {
            PhoneVariant variant = phoneVariantRepository.findByIdWithLock(itemReq.getPhoneVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", itemReq.getPhoneVariantId()));

            if (variant.getStockQuantity() != null && variant.getStockQuantity() < itemReq.getQuantity()) {
                throw new BadRequestException("Insufficient stock for variant " + variant.getId());
            }

            // Reduce stock
            if (variant.getStockQuantity() != null) {
                int quantityBefore = variant.getStockQuantity();
                variant.setStockQuantity(quantityBefore - itemReq.getQuantity());
                inventoryStockHistoryService.record(variant, quantityBefore, -itemReq.getQuantity(), "EXPORT", "Đặt hàng");
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
        if (shippingFee.signum() > 0
                && (freeThreshold.signum() <= 0 || finalAmount.compareTo(freeThreshold) < 0)) {
            finalAmount = finalAmount.add(shippingFee);
        }

        order.setFinalAmount(finalAmount);

        order = orderRepository.save(order);

        // Clear cart
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.getCartItems().clear();
            cartRepository.save(cart);
        });

        // Confirmation email:
        // - COD: confirmed at creation.
        // - Bank transfer (VIETQR): only when the payment is confirmed via the
        //   Sepay webhook — sending it here would reach the user before they pay.
        if (!"VIETQR".equalsIgnoreCase(request.getPaymentMethod())) {
            emailService.sendOrderConfirmation(user.getEmail(), String.valueOf(order.getId()));
        }

        return orderMapper.toDto(order);
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
        return cancelOrder(orderId, null);
    }

    public OrderDTO cancelOrder(Long orderId, String reason) {
        Long userId = SecurityUtils.getCurrentUserId();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot cancel another user's order");
        }

        if (!List.of("PENDING", "CONFIRMED").contains(order.getOrderStatus())) {
            throw new BadRequestException("Order cannot be cancelled at current status: " + order.getOrderStatus());
        }

        // Restore stock (pessimistic lock per variant — no double-restore with concurrent cancels)
        for (OrderDetail detail : order.getOrderDetails()) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant.getStockQuantity() != null) {
                PhoneVariant locked = phoneVariantRepository.findByIdWithLock(variant.getId())
                        .orElse(variant);
                int quantityBefore = locked.getStockQuantity();
                locked.setStockQuantity(quantityBefore + detail.getQuantity());
                inventoryStockHistoryService.record(locked, quantityBefore, detail.getQuantity(), "IMPORT", "Hủy đơn hàng");
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

            // Gỡ liên kết userPromotion khỏi đơn đã hủy để giải phóng khóa UNIQUE và trả lại voucher
            order.setUserPromotion(null);
        }

        order.setOrderStatus("CANCELLED");
        if (reason != null && !reason.trim().isEmpty()) {
            String existingNote = order.getNote();
            String cancelNote = "[Lý do hủy: " + reason.trim() + "]";
            if (existingNote != null && !existingNote.trim().isEmpty()) {
                order.setNote(existingNote + " " + cancelNote);
            } else {
                order.setNote(cancelNote);
            }
        }
        order = orderRepository.save(order);
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
        if (shippingFee.signum() > 0
                && (freeThreshold.signum() <= 0 || finalAmount.compareTo(freeThreshold) < 0)) {
            finalAmount = finalAmount.add(shippingFee);
        }
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
