package com.re.greenphone.dto.response;

import java.math.BigDecimal;

public record PaymentMethodBreakdown(
        String paymentMethod,
        BigDecimal revenue,
        Long transactionCount,
        BigDecimal percentage
) {
    public PaymentMethodBreakdown(String paymentMethod, BigDecimal revenue) {
        this(paymentMethod, revenue, 0L, BigDecimal.ZERO);
    }

    public PaymentMethodBreakdown(String paymentMethod, BigDecimal revenue, Long transactionCount) {
        this(paymentMethod, revenue, transactionCount, BigDecimal.ZERO);
    }
}

