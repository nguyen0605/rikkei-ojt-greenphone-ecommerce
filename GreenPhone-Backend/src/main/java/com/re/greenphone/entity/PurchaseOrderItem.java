package com.re.greenphone.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="purchase_order_item") @Getter @Setter @NoArgsConstructor
public class PurchaseOrderItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="po_id") private PurchaseOrder purchaseOrder;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="phone_variant_id") private PhoneVariant phoneVariant;
    @Column(nullable=false) private Integer quantityOrdered;
    @Column(nullable=false) private Integer quantityReceived = 0;
    @Column(nullable=false, precision=15, scale=2) private BigDecimal unitCost;
}
