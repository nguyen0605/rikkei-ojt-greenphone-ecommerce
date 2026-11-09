package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "SHIPMENT")
public class Shipment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_ID", nullable = false)
    private Order order;

    @Column(name = "TRACKING_NUMBER", nullable = false, unique = true, length = 100)
    private String trackingNumber;

    @Column(name = "CARRIER_CODE", nullable = false, length = 50)
    private String carrierCode; // GHN, GHTK, VIETTEL_POST

    @Column(name = "SHIPPING_FEE", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(name = "COD_AMOUNT", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "READY_TO_SHIP"; // READY_TO_SHIP, PICKED_UP, DELIVERING, DELIVERED, RETURNED, FAILED

    @Column(name = "ESTIMATED_DELIVERY_AT")
    private LocalDateTime estimatedDeliveryAt;

    @Column(name = "DELIVERED_AT")
    private LocalDateTime deliveredAt;

    @Column(name = "NOTE", length = 255)
    private String note;

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ShipmentHistory> histories = new ArrayList<>();
}
