package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentQRDTO {

    private Long orderId;
    private String qrUrl;
    private String accountNumber;
    private String accountHolder;
    private String bankCode;
    private String transferContent;
    private BigDecimal amount;
    /** ISO-8601 UTC with trailing Z, e.g. "2026-08-04T14:50:13Z" — JS Date() parses it as UTC. */
    private String expiresAt;
}
