package com.re.greenphone.dto.response;

import com.re.greenphone.entity.Warehouse;
import lombok.*;

import java.util.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterWarehouseTransferPlan {
    private Warehouse destinationWarehouse;
    private boolean directFulfillment;
    private boolean feasible;
    private int totalItemsToTransfer;
    private Double referenceDistanceKm;

    @Builder.Default
    private Map<Long, Integer> destinationAvailableStock = new HashMap<>();

    @Builder.Default
    private List<TransferPlanItem> transferItems = new ArrayList<>();

    public List<TransferPlanItem> getTransfers() {
        return transferItems;
    }

    public void setTransfers(List<TransferPlanItem> transfers) {
        this.transferItems = transfers;
    }
}
