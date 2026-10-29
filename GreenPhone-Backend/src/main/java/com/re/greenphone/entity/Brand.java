package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "BRAND")
public class Brand extends BaseEntity {

    @Column(name = "NAME", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "LOGO_URL", length = 255)
    private String logoUrl;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @OneToMany(mappedBy = "brand")
    @Builder.Default
    private List<Phone> phones = new ArrayList<>();
}
