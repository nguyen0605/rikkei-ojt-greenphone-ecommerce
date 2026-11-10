package com.re.greenphone.entity;

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
@Table(name = "REFUND_TRANSACTION")
public class RefundTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_ID", nullable = false, unique = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PAYMENT_ID")
    private Payment payment;

    @Column(name = "AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "REQUESTED";

    @Column(name = "REASON", nullable = false, length = 255)
    private String reason;

    @Column(name = "BANK_NAME", length = 100)
    private String bankName;

    @Column(name = "BANK_ACCOUNT", length = 50)
    private String bankAccount;

    @Column(name = "ACCOUNT_HOLDER", length = 100)
    private String accountHolder;

    @Column(name = "TRANSACTION_REF", length = 100)
    private String transactionRef;

    @Column(name = "REQUESTED_BY", nullable = false)
    private Long requestedBy;

    @Column(name = "PROCESSED_BY")
    private Long processedBy;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "REFUNDED_AT")
    private LocalDateTime refundedAt;
}

