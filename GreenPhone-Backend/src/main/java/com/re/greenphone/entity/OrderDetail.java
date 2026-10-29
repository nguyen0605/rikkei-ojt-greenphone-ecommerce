package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "ORDER_DETAIL")
public class OrderDetail extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_ID", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "PHONE_VARIANT_ID", nullable = false)
    private PhoneVariant phoneVariant;

    @Column(name = "PRODUCT_NAME", nullable = false, length = 150)
    private String productName;

    @Column(name = "RAM", nullable = false, length = 50)
    private String ram;

    @Column(name = "STORAGE", nullable = false, length = 50)
    private String storage;

    @Column(name = "COLOR", nullable = false, length = 50)
    private String color;

    @Column(name = "UNIT_PRICE", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "QUANTITY", nullable = false)
    private Integer quantity;

    @Column(name = "SUBTOTAL", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

}
