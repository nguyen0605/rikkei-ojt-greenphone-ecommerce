package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PaymentRepository paymentRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final OrderMapper orderMapper;
    private final EmailService emailService;

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

    public OrderDTO getOrderDetail(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        return orderMapper.toDto(order);
    }

    public OrderDTO updateStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if ("CANCELLED".equals(status)) {
            // State gate: already-cancelled orders are not cancelled twice
            if ("CANCELLED".equals(order.getOrderStatus())) {
                throw new BadRequestException("Order is already cancelled");
            }
            // Restore stock (pessimistic lock per variant — no double-restore)
            for (var detail : order.getOrderDetails()) {
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
            // Money state: order.paymentStatus is the single source of truth
            if ("PAID".equals(order.getPaymentStatus())) {
                order.setPaymentStatus("REFUNDED");
            }
        }

        order.setOrderStatus(status);
        order = orderRepository.save(order);

        if ("DELIVERED".equals(status)) {
            sendDeliveredEmail(order);
        }

        return orderMapper.toDto(order);
    }

    public OrderDTO updatePaymentStatus(Long id, String paymentStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (!List.of("UNPAID", "PAID", "REFUNDED").contains(paymentStatus)) {
            throw new BadRequestException("Invalid payment status: " + paymentStatus);
        }
        order.setPaymentStatus(paymentStatus);
        order = orderRepository.save(order);
        return orderMapper.toDto(order);
    }

    public OrderDTO confirmOrder(Long id) {
        return updateStatus(id, "CONFIRMED");
    }

    public OrderDTO updateDeliveryStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));

        if (!List.of("CONFIRMED", "PROCESSING", "SHIPPING").contains(order.getOrderStatus())) {
            throw new BadRequestException("Cannot update delivery at status: " + order.getOrderStatus());
        }

        order.setOrderStatus(status);
        order = orderRepository.save(order);

        if ("DELIVERED".equals(status)) {
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
