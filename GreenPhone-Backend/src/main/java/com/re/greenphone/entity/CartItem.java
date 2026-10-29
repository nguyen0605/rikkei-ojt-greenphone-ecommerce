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
@Table(name = "CART_ITEM", uniqueConstraints = {
        @UniqueConstraint(name = "UQ_CART_ITEM", columnNames = {"CART_ID", "PHONE_VARIANT_ID"})
})
public class CartItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CART_ID", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "PHONE_VARIANT_ID", nullable = false)
    private PhoneVariant phoneVariant;

    @Column(name = "QUANTITY", nullable = false)
    @Builder.Default
    private Integer quantity = 1;
}
