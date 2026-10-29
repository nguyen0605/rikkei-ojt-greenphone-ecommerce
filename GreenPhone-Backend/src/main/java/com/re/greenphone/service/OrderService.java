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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final CartRepository cartRepository;
    private final OrderMapper orderMapper;
    private final EmailService emailService;
    private final SettingsService settingsService;

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
                variant.setStockQuantity(variant.getStockQuantity() - itemReq.getQuantity());
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

            if (!up.getStatus().equals("AVAILABLE")) {
                throw new BadRequestException("Promotion no longer available");
            }

            Promotion promo = up.getPromotion();
            BigDecimal minOrder = promo.getMinOrderValue();
            if (minOrder != null && total.compareTo(minOrder) < 0) {
                throw new BadRequestException("Order amount does not meet promotion minimum");
            }

            BigDecimal discount = calculateDiscount(total, promo);
            order.setUserPromotion(up);
            order.setDiscountAmount(discount);
            up.setStatus("USED");
            userPromotionRepository.save(up);
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
                locked.setStockQuantity(locked.getStockQuantity() + detail.getQuantity());
                phoneVariantRepository.save(locked);
            }
        }

        // Restore the promotion so the voucher can be reused
        if (order.getUserPromotion() != null) {
            order.getUserPromotion().setStatus("AVAILABLE");
            order.getUserPromotion().setUsedAt(null);
            userPromotionRepository.save(order.getUserPromotion());
        }

        order.setOrderStatus("CANCELLED");
        order = orderRepository.save(order);
        return orderMapper.toDto(order);
    }

    public OrderDTO applyPromotionToOrder(Long orderId, Long userPromotionId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!"PENDING".equals(order.getOrderStatus())) {
            throw new BadRequestException("Can only apply promotion to pending orders");
        }

        UserPromotion up = userPromotionRepository.findById(userPromotionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserPromotion", "id", userPromotionId));

        BigDecimal discount = calculateDiscount(order.getTotalAmount(), up.getPromotion());
        order.setUserPromotion(up);
        order.setDiscountAmount(discount);
        order.setFinalAmount(order.getTotalAmount().subtract(discount));
        up.setStatus("USED");
        userPromotionRepository.save(up);

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
            discount = total.multiply(promo.getDiscountValue().divide(BigDecimal.valueOf(100)));
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
