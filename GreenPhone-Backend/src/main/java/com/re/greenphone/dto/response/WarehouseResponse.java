package com.re.greenphone.dto.response;

import java.time.LocalDateTime;

public record WarehouseResponse(Long id, String code, String name, String address,
                                String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
}
