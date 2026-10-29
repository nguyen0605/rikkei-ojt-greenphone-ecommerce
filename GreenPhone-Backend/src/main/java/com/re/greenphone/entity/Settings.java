package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "SETTINGS")
public class Settings extends BaseEntity {

    /** e.g. "SHIPPING_FEE", "FREE_SHIPPING_THRESHOLD" */
    @Column(name = "SETTING_KEY", nullable = false, unique = true, length = 50)
    private String settingKey;

    /** TEXT — may hold long HTML content (terms & privacy policy). */
    @Column(name = "SETTING_VALUE", nullable = false, columnDefinition = "TEXT")
    private String settingValue;

    @Column(name = "DESCRIPTION", length = 255)
    private String description;

    public BigDecimal decimalValue() {
        try {
            return new BigDecimal(settingValue);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
