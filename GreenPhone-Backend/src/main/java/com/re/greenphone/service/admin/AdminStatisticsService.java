package com.re.greenphone.service.admin;

import com.re.greenphone.dto.response.RevenueStats;
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

    public RevenueStats getRevenueStats(String period, LocalDateTime from, LocalDateTime to) {
        // Nếu có from/to (month filter) → dùng khoảng chính xác; ngược lại fallback period tương đối
        LocalDateTime startDate = (from != null) ? from : calculateStartDate(period);
        LocalDateTime endDate = (to != null) ? to : LocalDateTime.now();

        BigDecimal revenue = (from != null)
                ? orderRepository.calculateRevenueBetween(startDate, endDate)
                : orderRepository.calculateRevenue(startDate);
        long totalOrders = (from != null)
                ? orderRepository.countByCreatedAtBetween(startDate, endDate)
                : orderRepository.countByCreatedAtAfter(startDate);

        RevenueStats rs = new RevenueStats();
        rs.setTotalRevenue(revenue);
        rs.setTotalOrders(totalOrders);
        rs.setPeriod(period);
        rs.setStartDate(startDate.toString());
        rs.setEndDate(endDate.toString());
        return rs;
    }

    public OrderStats getOrderStats(LocalDateTime from, LocalDateTime to) {
        // Nếu có from/to → count theo khoảng; ngược lại count toàn thời gian
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
        return stats;
    }

    public List<TopSellingPhone> getTopSellingPhones(int limit, LocalDateTime from, LocalDateTime to) {
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

    private LocalDateTime calculateStartDate(String period) {
        return switch (period != null ? period.toLowerCase() : "month") {
            case "week" -> LocalDateTime.now().minusWeeks(1);
            case "year" -> LocalDateTime.now().minusYears(1);
            case "all" -> LocalDateTime.of(2000, 1, 1, 0, 0);
            default -> LocalDateTime.now().minusMonths(1);
        };
    }
}
