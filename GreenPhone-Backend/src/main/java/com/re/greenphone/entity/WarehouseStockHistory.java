package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "warehouse_stock_history") @Getter @Setter @NoArgsConstructor
public class WarehouseStockHistory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "warehouse_id") private Warehouse warehouse;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "phone_variant_id") private PhoneVariant phoneVariant;
    @Column(nullable = false, length = 30) private String changeType;
    @Column(nullable = false) private Integer quantityBefore;
    @Column(nullable = false) private Integer quantityChange;
    @Column(nullable = false) private Integer quantityAfter;
    @Column(nullable = false, length = 255) private String reason;
    @Column(nullable = false, length = 100) private String changedByName;
    @Column(length = 36) private String transferReference;
}
