package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundDTO {

    private Long id;
    private Long orderId;
    private Long paymentId;
    private BigDecimal amount;
    private String status;
    private String reason;
    private String bankName;
    private String bankAccount;
    private String accountHolder;
    private String transactionRef;
    private Long requestedBy;
    private Long processedBy;
    private String orderStatus;
    private String paymentStatus;
    private LocalDateTime createdAt;
    private LocalDateTime refundedAt;
}

