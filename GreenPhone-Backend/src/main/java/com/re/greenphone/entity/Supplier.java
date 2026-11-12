package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "supplier") @Getter @Setter @NoArgsConstructor
public class Supplier extends BaseEntity {
    @Column(nullable=false, length=50, unique=true) private String code;
    @Column(nullable=false, length=150) private String name;
    @Column(length=30) private String taxCode;
    @Column(length=100) private String email;
    @Column(length=20) private String phone;
    @Column(length=255) private String address;
    @Column(nullable=false, length=30) private String status = "ACTIVE";
}
