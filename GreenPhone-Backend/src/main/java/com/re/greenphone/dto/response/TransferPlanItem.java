package com.re.greenphone.dto.response;

import com.re.greenphone.entity.Warehouse;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferPlanItem {
    private Warehouse sourceWarehouse;
    private Warehouse destinationWarehouse;
    private Long phoneVariantId;
    private Integer quantity;
    private Double distanceBetweenWarehousesKm;

    public Long getSourceWarehouseId() {
        return sourceWarehouse != null ? sourceWarehouse.getId() : null;
    }

    public Long getDestinationWarehouseId() {
        return destinationWarehouse != null ? destinationWarehouse.getId() : null;
    }
}
