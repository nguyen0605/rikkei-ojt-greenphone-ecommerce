package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenueStats {

    private BigDecimal totalRevenue;
    private Long totalOrders;
    private String period;
    private String startDate;
    private String endDate;
}
