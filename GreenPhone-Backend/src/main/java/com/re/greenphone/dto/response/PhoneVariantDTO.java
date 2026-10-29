package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneVariantDTO {

    private Long id;
    private Long phoneId;
    private Long ramItemId;
    private Long storageItemId;
    private Long colorItemId;
    /** Resolved display values (from the option items). */
    private String ram;
    private String storage;
    private String color;
    private BigDecimal price;
    private BigDecimal discountPrice;
    private Integer stockQuantity;
    private String sku;
    private String status;
}
