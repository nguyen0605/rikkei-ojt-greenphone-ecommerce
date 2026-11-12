package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;

@Entity @Table(name="purchase_order") @Getter @Setter @NoArgsConstructor
public class PurchaseOrder extends BaseEntity {
    @Column(nullable=false, length=50, unique=true) private String poNumber;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="supplier_id") private Supplier supplier;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="warehouse_id") private Warehouse warehouse;
    @Column(nullable=false, length=30) private String status;
    @Column(nullable=false, precision=15, scale=2) private BigDecimal totalCost;
    @Column(columnDefinition="TEXT") private String note;
    @OneToMany(mappedBy="purchaseOrder", cascade=CascadeType.ALL, orphanRemoval=true) @OrderBy("id ASC")
    private List<PurchaseOrderItem> items = new ArrayList<>();
}
