package com.re.greenphone.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartSyncRequest {

    @Valid
    @NotNull(message = "Items list cannot be null")
    @Builder.Default
    private List<CartItemRequest> items = new ArrayList<>();
}

