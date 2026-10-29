package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    private String paymentProvider;
    private String transactionCode;
}
