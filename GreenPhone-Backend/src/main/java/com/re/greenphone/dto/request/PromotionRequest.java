package com.re.greenphone.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionRequest {

    @NotBlank(message = "Promotion code is required")
    private String code;

    @NotBlank(message = "Promotion name is required")
    private String name;

    private String description;

    @NotBlank(message = "Discount type is required")
    private String discountType;

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0", message = "Discount value must be >= 0")
    private BigDecimal discountValue;

    private BigDecimal maxDiscountAmount;

    @DecimalMin(value = "0", message = "Min order value must be >= 0")
    private BigDecimal minOrderValue;

    @Min(value = 0, message = "Quantity must be >= 0")
    @Builder.Default
    private Integer quantity = 0;

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;
}
