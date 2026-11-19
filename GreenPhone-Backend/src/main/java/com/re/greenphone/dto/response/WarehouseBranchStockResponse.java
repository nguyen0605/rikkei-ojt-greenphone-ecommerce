package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseBranchStockResponse {
    private Long id;
    private String code;
    private String name;
    private String address;
    private String province;
    private String district;
    private String phone;
    private Double latitude;
    private Double longitude;
    private Double distanceKm;
    private Integer quantity;
    private Boolean inStock;
    private String status;
}
