package com.re.greenphone.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderRequest {

    @Schema(description = "Lý do hủy đơn hàng của khách hàng", example = "Đặt nhầm màu")
    private String reason;
}
