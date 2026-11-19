package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NearestWarehouseStockResponse {

    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private String warehouseAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Double distanceKm;
    private String status;
    /** Map of phoneVariantId to available quantity at this warehouse */
    private Map<Long, Integer> stocks;
}
