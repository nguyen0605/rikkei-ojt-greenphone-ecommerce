package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemRequest {

    @NotNull(message = "Phone variant ID is required")
    private Long phoneVariantId;

    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;
}
