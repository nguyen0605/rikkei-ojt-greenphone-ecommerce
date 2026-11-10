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

    @Schema(description = "Tên ngân hàng nhận tiền hoàn (dành cho đơn đã thanh toán online)", example = "MB Bank")
    private String bankName;

    @Schema(description = "Số tài khoản ngân hàng", example = "0987654321")
    private String accountNumber;

    @Schema(description = "Tên chủ tài khoản", example = "NGUYEN VAN A")
    private String accountHolder;
}
