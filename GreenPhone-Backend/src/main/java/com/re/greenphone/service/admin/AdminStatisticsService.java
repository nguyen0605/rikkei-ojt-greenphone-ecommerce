package com.re.greenphone.service.admin;

import com.re.greenphone.dto.response.RevenueStats;
import com.re.greenphone.dto.response.FinancialReportDTO;
import com.re.greenphone.dto.response.FinancialTimeSeriesPoint;
import com.re.greenphone.dto.response.RevenueTimeSeriesPoint;
import com.re.greenphone.dto.response.PaymentMethodBreakdown;
import com.re.greenphone.repository.RefundRepository;
import com.re.greenphone.common.exception.BadRequestException;
import java.util.ArrayList;
import java.util.HashMap;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.ZoneOffset;
import com.re.greenphone.dto.response.OrderStats;
import com.re.greenphone.dto.response.TopSellingPhone;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminStatisticsService {

    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final RefundRepository refundRepository;

    public RevenueStats getRevenueStats(String period, LocalDateTime from, LocalDateTime to) {
        var range = range(period, from, to, true);
        var amounts = daily(orderRepository.financialDaily(range[0], range[1]));
        BigDecimal total = BigDecimal.ZERO;
        long count = 0;
        var points = new ArrayList<RevenueTimeSeriesPoint>();
        for (var day = range[0].plusHours(7).toLocalDate(); day.atStartOfDay().isBefore(range[1].plusHours(7)); day = day.plusDays(1)) {
            var row = amounts.get(day.toString());
            BigDecimal revenue = row == null ? BigDecimal.ZERO : decimal(row[1]).subtract(decimal(row[2]));
            total = total.add(revenue);
            if (row != null) count += ((Number) row[4]).longValue();
            points.add(new RevenueTimeSeriesPoint(day.toString(), revenue));
        }
        RevenueStats result = new RevenueStats();
        result.setTotalRevenue(total); result.setTotalOrders(count); result.setPeriod(period);
        result.setStartDate(range[0].toString()); result.setEndDate(range[1].toString()); result.setTimeSeriesData(points);
        return result;
    }

    public OrderStats getOrderStats(LocalDateTime from, LocalDateTime to) {
        // Nếu có from/to → count theo khoảng; ngược lại count toàn thời gian
        validateBounds(from, to);
        long pending = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("PENDING", from, to)
                : orderRepository.countByOrderStatus("PENDING");
        long confirmed = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("CONFIRMED", from, to)
                : orderRepository.countByOrderStatus("CONFIRMED");
        long processing = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("PROCESSING", from, to)
                : orderRepository.countByOrderStatus("PROCESSING");
        long shipping = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("SHIPPING", from, to)
                : orderRepository.countByOrderStatus("SHIPPING");
        long delivered = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("DELIVERED", from, to)
                : orderRepository.countByOrderStatus("DELIVERED");
        long cancelled = (from != null)
                ? orderRepository.countByOrderStatusAndCreatedAtBetween("CANCELLED", from, to)
                : orderRepository.countByOrderStatus("CANCELLED");

        OrderStats stats = new OrderStats();
        stats.setTotalOrders(pending + confirmed + processing + shipping + delivered + cancelled);
        stats.setConfirmedOrders(confirmed);
        stats.setPendingOrders(pending);
        stats.setCancelledOrders(cancelled);
        stats.setDeliveredOrders(delivered);
        stats.setProcessingOrders(processing);
        stats.setShippingOrders(shipping);
        return stats;
    }

    public List<TopSellingPhone> getTopSellingPhones(int limit, LocalDateTime from, LocalDateTime to) {
        validateBounds(from, to);
        List<Object[]> rows = (from != null)
                ? orderDetailRepository.findTopSellingPhonesBetween(from, to)
                : orderDetailRepository.findTopSellingPhonesRaw();
        return rows.stream()
                .limit(Math.max(1, limit))
                .map(row -> {
                    TopSellingPhone phone = new TopSellingPhone();
                    phone.setPhoneId((Long) row[0]);
                    phone.setPhoneName((String) row[1]);
                    phone.setBrandName((String) row[2]);
                    phone.setSoldQuantity((Long) row[3]);
                    return phone;
                })
                .toList();
    }

    public FinancialReportDTO getFinancialReport(String period, LocalDateTime from, LocalDateTime to) {
        var range = range(period, from, to);
        var sales = daily(orderRepository.financialDaily(range[0], range[1]));
        var costs = daily(orderDetailRepository.costDaily(range[0], range[1]));
        var refunds = daily(refundRepository.refundDaily(range[0], range[1]));
        BigDecimal gross = BigDecimal.ZERO, discounts = BigDecimal.ZERO, shipping = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO, cogs = BigDecimal.ZERO, refunded = BigDecimal.ZERO;
        long missing = 0;
        var points = new ArrayList<FinancialTimeSeriesPoint>();
        for (var day = range[0].plusHours(7).toLocalDate(); day.atStartOfDay().isBefore(range[1].plusHours(7)); day = day.plusDays(1)) {
            String key = day.toString();
            BigDecimal g = value(sales,key,1), d = value(sales,key,2), sh = value(sales,key,3);
            BigDecimal c = value(costs,key,1), refund = value(refunds,key,1);
            long unknown = value(costs,key,2).longValue();
            BigDecimal revenue = g.subtract(d);
            gross = gross.add(g); discounts = discounts.add(d); shipping = shipping.add(sh);
            net = net.add(revenue); cogs = cogs.add(c); refunded = refunded.add(refund); missing += unknown;
            points.add(new FinancialTimeSeriesPoint(key,revenue,unknown>0 ? null : revenue.subtract(c)));
        }
        BigDecimal profit = missing>0 ? null : net.subtract(cogs);
        BigDecimal margin = profit == null ? null : net.signum()==0 ? BigDecimal.ZERO : profit.multiply(BigDecimal.valueOf(100)).divide(net,2,RoundingMode.HALF_UP);
        var rawMethods = orderRepository.paymentBreakdown(range[0], range[1]);
        BigDecimal totalMethodRevenue = BigDecimal.ZERO;
        for (Object[] row : rawMethods) {
            totalMethodRevenue = totalMethodRevenue.add(decimal(row[1]));
        }
        final BigDecimal totalRev = totalMethodRevenue;
        var methods = rawMethods.stream().map(row -> {
            String method = row[0] != null ? row[0].toString() : "UNKNOWN";
            BigDecimal rev = decimal(row[1]);
            long count = row.length > 2 && row[2] != null ? ((Number) row[2]).longValue() : 0L;
            BigDecimal pct = (totalRev.signum() > 0)
                    ? rev.multiply(BigDecimal.valueOf(100)).divide(totalRev, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return new PaymentMethodBreakdown(method, rev, count, pct);
        }).toList();
        return new FinancialReportDTO(gross,discounts,shipping,net,
                missing>0 ? null : cogs,profit,margin,refunded,missing,range[0].toString(),range[1].toString(),points,methods);
    }

    private static BigDecimal decimal(Object value) { return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString()); }
    private static Map<String,Object[]> daily(List<Object[]> rows) {
        Map<String,Object[]> result = new HashMap<>();
        for (Object[] row : rows) result.put(row[0].toString().substring(0,10), row);
        return result;
    }
    private static BigDecimal value(Map<String,Object[]> rows, String date, int index) {
        return rows.containsKey(date) ? decimal(rows.get(date)[index]) : BigDecimal.ZERO;
    }
    private static void validateBounds(LocalDateTime from, LocalDateTime to) {
        if ((from == null) != (to == null) || (from != null && !from.isBefore(to)))
            throw new BadRequestException("Provide both from and to, with from before to");
    }
    private LocalDateTime[] range(String period, LocalDateTime from, LocalDateTime to) {
        return range(period, from, to, false);
    }
    private LocalDateTime[] range(String period, LocalDateTime from, LocalDateTime to, boolean legacyRevenue) {
        validateBounds(from,to);
        LocalDateTime end = to == null ? LocalDateTime.now(ZoneOffset.UTC) : to;
        LocalDateTime start = from == null ? switch (period == null ? "month" : period.toLowerCase()) {
            case "day" -> end.minusDays(1);
            case "week" -> end.minusWeeks(1);
            case "month" -> end.minusMonths(1);
            case "year" -> end.minusYears(1);
            case "all" -> {
                if (!legacyRevenue) throw new BadRequestException("Unsupported period");
                yield LocalDateTime.of(2000, 1, 1, 0, 0);
            }
            default -> throw new BadRequestException("Unsupported period");
        } : from;
        boolean legacyAll = legacyRevenue && from == null && "all".equalsIgnoreCase(period);
        if (!legacyAll && Duration.between(start,end).compareTo(Duration.ofDays(366))>0)
            throw new BadRequestException("Maximum reporting range is 366 days");
        return new LocalDateTime[]{start,end};
    }
}
