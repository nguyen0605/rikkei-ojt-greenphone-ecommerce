package com.re.greenphone.dto.request;
import jakarta.validation.constraints.*;
public record WarehouseMovementRequest(@NotNull @Positive Long variantId,
        @NotBlank @Pattern(regexp = "IMPORT|EXPORT") String changeType,
        @Positive int quantity, @NotBlank @Size(max = 255) String reason) { }
