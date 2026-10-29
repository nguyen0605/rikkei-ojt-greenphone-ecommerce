package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStats {

    private Long totalOrders;
    private Long confirmedOrders;
    private Long pendingOrders;
    private Long cancelledOrders;
    private Long deliveredOrders;
    private String period;
}
