package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "PHONE_VARIANT", uniqueConstraints = {
        @UniqueConstraint(name = "UQ_PHONE_VARIANT", columnNames = {"PHONE_ID", "RAM_ITEM_ID", "STORAGE_ITEM_ID", "COLOR_ITEM_ID"})
})
public class PhoneVariant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PHONE_ID", nullable = false)
    private Phone phone;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "RAM_ITEM_ID", nullable = false)
    private OptionItem ramItem;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "STORAGE_ITEM_ID", nullable = false)
    private OptionItem storageItem;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "COLOR_ITEM_ID", nullable = false)
    private OptionItem colorItem;

    @Column(name = "PRICE", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "DISCOUNT_PRICE", precision = 12, scale = 2)
    private BigDecimal discountPrice;

    @Column(name = "STOCK_QUANTITY", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "SKU", unique = true, length = 100)
    private String sku;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    // === Optimistic Locking: prevents overselling via concurrent stock deduction ===
    @Version
    @Column(name = "VERSION")
    private Long version;

    @OneToMany(mappedBy = "phoneVariant")
    @Builder.Default
    private List<CartItem> cartItems = new ArrayList<>();

    @OneToMany(mappedBy = "phoneVariant")
    @Builder.Default
    private List<OrderDetail> orderDetails = new ArrayList<>();
}
