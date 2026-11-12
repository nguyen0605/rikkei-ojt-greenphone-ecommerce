package com.re.greenphone.dto.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
public record PurchaseOrderRequest(
    @NotNull @Positive Long supplierId,
    @NotNull @Positive Long warehouseId,
    @Pattern(regexp="DRAFT|ORDERED") String status,
    @Size(max=2000) String note,
    @NotEmpty @Size(max=100) List<@NotNull @Valid Item> items
) {
    public record Item(@NotNull @Positive Long variantId,
        @NotNull @Positive Integer quantity,
        @NotNull @DecimalMin("1") @Digits(integer=13,fraction=0) BigDecimal unitCost) {}
}
