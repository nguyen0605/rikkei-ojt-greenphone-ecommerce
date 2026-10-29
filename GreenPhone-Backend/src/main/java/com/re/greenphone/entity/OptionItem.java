package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * An individual selectable value within an {@link Option} category (e.g. "8GB", "black", "5G").
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "OPTION_ITEM",
        uniqueConstraints = @UniqueConstraint(name = "UQ_OPTION_ITEM_OPTION_VALUE", columnNames = {"OPTION_ID", "VALUE"}))
public class OptionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "OPTION_ID", nullable = false)
    private Option option;

    @Column(name = "VALUE", nullable = false, length = 50)
    private String value;

    /** Hex color (e.g. "#1F1F1F") — only meaningful for COLOR category. */
    @Column(name = "HEX_COLOR", length = 7)
    private String hexColor;

    @Column(name = "SORT_ORDER", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
