package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemDTO {

    private Long id;
    private Long phoneVariantId;
    private Long phoneId;
    private String phoneName;
    private String ram;
    private String storage;
    private String color;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal discountPrice;
    private Integer quantity;
    private BigDecimal subtotal;
}
