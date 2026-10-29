package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentDTO {

    private Long id;
    private Long orderId;
    private String paymentProvider;
    private String transactionCode;
    private BigDecimal amount;
    private LocalDateTime paidAt;
}
