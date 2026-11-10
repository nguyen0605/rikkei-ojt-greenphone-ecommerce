package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmRefundRequest {

    @NotBlank(message = "Mã tham chiếu ngân hàng không được để trống")
    private String transactionRef;

    private String note;
}

