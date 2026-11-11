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
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";
}
