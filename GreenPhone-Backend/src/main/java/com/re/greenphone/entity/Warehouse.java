package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "warehouse", uniqueConstraints = @UniqueConstraint(name = "uq_warehouse_code", columnNames = "code"))
public class Warehouse extends BaseEntity {
    @Column(nullable = false, length = 50)
    private String code;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(nullable = false, length = 255)
    private String address;
    @Column(precision = 10, scale = 8)
    private java.math.BigDecimal latitude;
    @Column(precision = 11, scale = 8)
    private java.math.BigDecimal longitude;
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    public Double getLatitudeAsDouble() {
        return latitude != null ? latitude.doubleValue() : null;
    }

    public Double getLongitudeAsDouble() {
        return longitude != null ? longitude.doubleValue() : null;
    }
}
