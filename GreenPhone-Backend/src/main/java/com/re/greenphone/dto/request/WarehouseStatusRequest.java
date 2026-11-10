package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record WarehouseStatusRequest(
        @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE") String status) {
}
