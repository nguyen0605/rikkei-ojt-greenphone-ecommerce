package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneVariantRequest {

    @NotNull(message = "RAM item is required")
    private Long ramItemId;

    @NotNull(message = "Storage item is required")
    private Long storageItemId;

    @NotNull(message = "Color item is required")
    private Long colorItemId;

    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price must be >= 0")
    private BigDecimal price;

    private BigDecimal discountPrice;

    @Min(value = 0, message = "Stock quantity must be >= 0")
    @Builder.Default
    private Integer stockQuantity = 0;

    private String sku;
}
