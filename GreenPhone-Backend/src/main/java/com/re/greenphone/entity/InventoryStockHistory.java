package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "INVENTORY_STOCK_HISTORY")
public class InventoryStockHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "PHONE_VARIANT_ID", nullable = false)
    private PhoneVariant phoneVariant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CHANGED_BY_USER_ID")
    private User changedByUser;

    @Column(name = "CHANGED_BY_NAME", nullable = false, length = 100)
    private String changedByName;

    @Column(name = "CHANGE_TYPE", nullable = false, length = 30)
    private String changeType;

    @Column(name = "QUANTITY_BEFORE", nullable = false)
    private Integer quantityBefore;

    @Column(name = "QUANTITY_CHANGE", nullable = false)
    private Integer quantityChange;

    @Column(name = "QUANTITY_AFTER", nullable = false)
    private Integer quantityAfter;

    @Column(name = "REASON", nullable = false, length = 255)
    private String reason;
}
