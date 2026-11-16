package com.re.greenphone.dto.response;
import java.math.BigDecimal;
public record FinancialTimeSeriesPoint(String date, BigDecimal revenue, BigDecimal grossProfit) {}
