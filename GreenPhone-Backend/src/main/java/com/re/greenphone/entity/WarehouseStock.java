package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "warehouse_stock", uniqueConstraints = @UniqueConstraint(name = "uq_warehouse_variant", columnNames = {"warehouse_id", "phone_variant_id"}))
@Getter @Setter @NoArgsConstructor
public class WarehouseStock extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "phone_variant_id")
    private PhoneVariant phoneVariant;
    @Column(nullable = false) private Integer quantity = 0;
}
