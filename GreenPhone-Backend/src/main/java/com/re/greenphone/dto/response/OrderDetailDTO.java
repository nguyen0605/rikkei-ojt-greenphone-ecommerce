package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDetailDTO {

    private Long id;
    private Long phoneVariantId;
    private String productName;
    private String ram;
    private String storage;
    private String color;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    /** True if the current user already reviewed this order detail's phone. */
    private Boolean reviewed;
}
