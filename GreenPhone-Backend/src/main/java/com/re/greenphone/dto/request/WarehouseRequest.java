package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record WarehouseRequest(
        @NotBlank @Size(max = 50)
        @Pattern(regexp = "^[A-Z0-9]+(?:-[A-Z0-9]+)*$", message = "Code must contain uppercase ASCII letters, digits and separating hyphens")
        String code,
        @NotBlank @Size(min = 3, max = 150) String name,
        @NotBlank @Size(max = 255) String address) {
    public WarehouseRequest {
        name = name == null ? null : name.strip();
        address = address == null ? null : address.strip();
    }
}
