package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionDTO {

    private Long id;
    private String code;
    private String name;
    private String description;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderValue;
    private Integer quantity;
    private Integer claimedQuantity;
    private Integer usedQuantity;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
}
