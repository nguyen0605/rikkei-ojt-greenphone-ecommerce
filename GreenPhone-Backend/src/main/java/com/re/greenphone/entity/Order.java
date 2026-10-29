package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "ORDERS")
public class Order extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_PROMOTION_ID", unique = true)
    private UserPromotion userPromotion;

    @Column(name = "RECEIVER_NAME", nullable = false, length = 100)
    private String receiverName;

    @Column(name = "RECEIVER_PHONE", nullable = false, length = 20)
    private String receiverPhone;

    @Column(name = "SHIPPING_ADDRESS", nullable = false, length = 255)
    private String shippingAddress;

    @Column(name = "TOTAL_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "DISCOUNT_AMOUNT", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "FINAL_AMOUNT", nullable = false, precision = 12, scale = 2)
    private BigDecimal finalAmount;

    @Column(name = "ORDER_STATUS", nullable = false, length = 30)
    @Builder.Default
    private String orderStatus = "PENDING";

    @Column(name = "PAYMENT_STATUS", nullable = false, length = 30)
    @Builder.Default
    private String paymentStatus = "UNPAID";

    @Column(name = "PAYMENT_METHOD", nullable = false, length = 30)
    private String paymentMethod;

    @Column(name = "NOTE", length = 255)
    private String note;

    /**
     * Optimistic lock: guards cancel/timeout vs payment-webhook races.
     */
    @Version
    @Column(name = "VERSION")
    private Long version;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderDetail> orderDetails = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();
}
