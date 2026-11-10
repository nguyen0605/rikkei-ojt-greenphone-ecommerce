package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRefundRequest {

    @NotBlank(message = "Lý do hoàn tiền không được để trống")
    private String reason;

    private String bankName;

    private String bankAccount;

    private String accountHolder;
}

