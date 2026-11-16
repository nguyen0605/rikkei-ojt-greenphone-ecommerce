package com.re.greenphone.service.admin;
import com.re.greenphone.repository.*;
import com.re.greenphone.common.exception.BadRequestException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
@ExtendWith(MockitoExtension.class)
class AdminStatisticsServiceTest {
    @Mock OrderRepository orders;
    @Mock OrderDetailRepository details;
    @Mock RefundRepository refunds;
    @InjectMocks AdminStatisticsService service;
    final LocalDateTime from=LocalDateTime.of(2026,10,31,17,0), to=from.plusDays(2);
    @Test void calculatesExactProfitAndDoesNotDoubleSubtractRefunds() {
        when(orders.financialDaily(from,to)).thenReturn(Collections.singletonList(new Object[]{"2026-11-01",new BigDecimal("1000"),new BigDecimal("100"),new BigDecimal("30"),2L}));
        when(details.costDaily(from,to)).thenReturn(Collections.singletonList(new Object[]{"2026-11-01",new BigDecimal("600"),0L}));
        when(refunds.refundDaily(from,to)).thenReturn(Collections.singletonList(new Object[]{"2026-11-01",new BigDecimal("50")}));
        var report=service.getFinancialReport("month",from,to);
        assertThat(report.netRevenue()).isEqualByComparingTo("900"); assertThat(report.cogs()).isEqualByComparingTo("600");
        assertThat(report.grossProfit()).isEqualByComparingTo("300"); assertThat(report.profitMarginPercentage()).isEqualByComparingTo("33.33");
        assertThat(report.refundAmount()).isEqualByComparingTo("50"); assertThat(report.shippingFee()).isEqualByComparingTo("30");
        assertThat(report.timeSeriesData()).hasSize(2); assertThat(report.timeSeriesData().get(1).revenue()).isZero();
    }
    @Test void zeroRevenueHasZeroMargin() { assertThat(service.getFinancialReport("month",from,to).profitMarginPercentage()).isZero(); }
    @Test void preservesLegacyAllTimeRevenuePeriod() {
        assertThat(service.getRevenueStats("all",null,null).getTotalRevenue()).isZero();
        assertThatThrownBy(()->service.getFinancialReport("all",null,null)).isInstanceOf(BadRequestException.class);
    }
    @Test void unknownHistoricalCostIsNotZeroProfit() {
        when(details.costDaily(from,to)).thenReturn(Collections.singletonList(new Object[]{"2026-11-01",null,3L}));
        var report=service.getFinancialReport("month",from,to);
        assertThat(report.uncostedQuantity()).isEqualTo(3); assertThat(report.cogs()).isNull(); assertThat(report.grossProfit()).isNull();
        assertThat(report.profitMarginPercentage()).isNull(); assertThat(report.timeSeriesData().get(0).grossProfit()).isNull();
    }
    @Test void invalidRangesRejectedBeforeQueries() {
        assertThatThrownBy(()->service.getFinancialReport("month",to,from)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->service.getFinancialReport("month",from,null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->service.getFinancialReport("month",from,from.plusDays(367))).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(orders,details,refunds);
    }
    @Test void exposesProcessingAndShippingCounts() {
        when(orders.countByOrderStatus(anyString())).thenAnswer(call -> switch ((String) call.getArgument(0)) { case "PROCESSING" -> 4L; case "SHIPPING" -> 7L; default -> 0L; });
        var result=service.getOrderStats(null,null); assertThat(result.getProcessingOrders()).isEqualTo(4); assertThat(result.getShippingOrders()).isEqualTo(7); assertThat(result.getTotalOrders()).isEqualTo(11);
    }
    @Test void publicRevenueHasNoCostsAndMatchesFinancialNet() {
        when(orders.financialDaily(from,to)).thenReturn(Collections.singletonList(new Object[]{"2026-11-01",BigDecimal.TEN,BigDecimal.ONE,BigDecimal.ONE,1L}));
        var result=service.getRevenueStats("month",from,to); assertThat(result.getTotalRevenue()).isEqualByComparingTo("9"); assertThat(result.getTimeSeriesData()).hasSize(2);
        verifyNoInteractions(details,refunds);
    }
}
