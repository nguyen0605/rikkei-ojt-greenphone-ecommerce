package com.re.greenphone.dto.request;
import jakarta.validation.constraints.*;
public record WarehouseTransferRequest(@NotNull @Positive Long variantId,
        @NotNull @Positive Long targetWarehouseId, @Positive int quantity,
        @NotBlank @Size(max = 255) String reason) { }
