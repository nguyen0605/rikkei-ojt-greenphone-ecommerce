package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "warehouse_transfer_item")
public class WarehouseTransferItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transfer_id", nullable = false)
    private WarehouseTransfer transfer;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "phone_variant_id", nullable = false)
    private PhoneVariant phoneVariant;

    @Column(name = "requested_quantity", nullable = false)
    private Integer requestedQuantity;

    @Column(name = "dispatched_quantity", nullable = false)
    @Builder.Default
    private Integer dispatchedQuantity = 0;

    @Column(name = "received_quantity", nullable = false)
    @Builder.Default
    private Integer receivedQuantity = 0;

    public int getInTransitQuantity() {
        int d = dispatchedQuantity != null ? dispatchedQuantity : 0;
        int r = receivedQuantity != null ? receivedQuantity : 0;
        return Math.max(0, d - r);
    }
}

