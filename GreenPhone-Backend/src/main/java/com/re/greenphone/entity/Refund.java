package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "refund")
public class Refund extends BaseEntity {

    @Column(name = "refund_code", nullable = false, unique = true, length = 100)
    private String refundCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id")
    private ReturnRequest returnRequest;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "refunded_at", nullable = false)
    @Builder.Default
    private LocalDateTime refundedAt = LocalDateTime.now();
}

