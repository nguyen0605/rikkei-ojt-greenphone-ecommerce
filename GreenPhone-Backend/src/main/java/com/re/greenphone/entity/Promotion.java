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
@Table(name = "PROMOTION")
public class Promotion extends BaseEntity {

    @Column(name = "CODE", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    @Column(name = "DESCRIPTION", length = 255)
    private String description;

    @Column(name = "DISCOUNT_TYPE", nullable = false, length = 30)
    private String discountType;

    @Column(name = "DISCOUNT_VALUE", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "MAX_DISCOUNT_AMOUNT", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "MIN_ORDER_VALUE", precision = 12, scale = 2)
    private BigDecimal minOrderValue;

    @Column(name = "QUANTITY", nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(name = "CLAIMED_QUANTITY", nullable = false)
    @Builder.Default
    private Integer claimedQuantity = 0;

    @Column(name = "USED_QUANTITY", nullable = false)
    @Builder.Default
    private Integer usedQuantity = 0;

    @Column(name = "START_DATE", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "END_DATE", nullable = false)
    private LocalDateTime endDate;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @OneToMany(mappedBy = "promotion")
    @Builder.Default
    private List<UserPromotion> userPromotions = new ArrayList<>();
}
