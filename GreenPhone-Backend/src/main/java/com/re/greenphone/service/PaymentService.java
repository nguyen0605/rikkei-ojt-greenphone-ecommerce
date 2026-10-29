package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.PaymentDTO;
import com.re.greenphone.dto.response.PaymentQRDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.mapper.PaymentMapper;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentMapper paymentMapper;
    private final SepayService sepayService;

    public PaymentDTO createPayment(Long orderId, String method) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Ownership: only the order's owner can create a payment for it
        Long userId = SecurityUtils.getCurrentUserId();
        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot pay for another user's order");
        }

        // Reject terminal orders
        if (List.of("DELIVERED", "CANCELLED").contains(order.getOrderStatus())) {
            throw new BadRequestException("Order is in terminal state: " + order.getOrderStatus());
        }

        // Dedup: reuse the existing payment row instead of creating a second one
        List<Payment> existing = paymentRepository.findByOrderId(orderId);
        if (!existing.isEmpty()) {
            return paymentMapper.toDto(existing.get(0));
        }

        Payment payment = Payment.builder()
                .order(order)
                .amount(order.getFinalAmount())
                .build();

        payment = paymentRepository.save(payment);
        return paymentMapper.toDto(payment);
    }

    public PaymentDTO getPayment(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Ownership: don't leak other users' payment info (IDOR)
        Long userId = SecurityUtils.getCurrentUserId();
        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot view another user's payment");
        }

        List<Payment> payments = paymentRepository.findByOrderIdOrderByIdAsc(orderId);
        if (payments.isEmpty()) throw new ResourceNotFoundException("Payment for order: " + orderId);
        return paymentMapper.toDto(payments.get(0));
    }

    public PaymentQRDTO getQRCode(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Ownership: QR code (amount + account) must not leak to other users
        Long userId = SecurityUtils.getCurrentUserId();
        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot view another user's payment QR");
        }

        // Exact amount to the VND — longValue() would truncate fractional amounts
        long amount = order.getFinalAmount().setScale(0, java.math.RoundingMode.HALF_UP).longValue();
        String desc = "GREENPHONE" + order.getId();

        return PaymentQRDTO.builder()
                .orderId(order.getId())
                .qrUrl(sepayService.generateQRUrl(amount, desc))
                .accountNumber(sepayService.getEnvValue("SEPAY_ACCOUNT_NUMBER", "0943941773"))
                .accountHolder(sepayService.getEnvValue("SEPAY_ACCOUNT_HOLDER", "GREENPHONE"))
                .bankCode(sepayService.getEnvValue("SEPAY_BANK_CODE", "MBB"))
                .transferContent(desc)
                .amount(BigDecimal.valueOf(amount))
                .expiresAt(order.getCreatedAt() != null
                        ? order.getCreatedAt().plusMinutes(10)
                                .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
                        : null)
                .build();
    }
}
