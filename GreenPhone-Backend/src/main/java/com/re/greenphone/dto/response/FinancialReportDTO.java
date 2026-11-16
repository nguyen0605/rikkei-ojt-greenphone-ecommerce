package com.re.greenphone.dto.response;
import java.math.BigDecimal;
import java.util.List;
public record FinancialReportDTO(BigDecimal grossRevenue, BigDecimal discountAmount, BigDecimal shippingFee,
        BigDecimal netRevenue, BigDecimal cogs, BigDecimal grossProfit, BigDecimal profitMarginPercentage,
        BigDecimal refundAmount, long uncostedQuantity, String startDate, String endDate,
        List<FinancialTimeSeriesPoint> timeSeriesData, List<PaymentMethodBreakdown> paymentMethodStats) {}
