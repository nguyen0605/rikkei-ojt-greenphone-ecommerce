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
@Table(name = "PHONE")
public class Phone extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BRAND_ID", nullable = false)
    private Brand brand;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @Column(name = "SCREEN", length = 100)
    private String screen;

    @Column(name = "OS", length = 100)
    private String os;

    @Column(name = "CHIP", length = 100)
    private String chip;

    @Column(name = "REAR_CAMERA", length = 100)
    private String rearCamera;

    @Column(name = "FRONT_CAMERA", length = 100)
    private String frontCamera;

    @Column(name = "BATTERY", length = 100)
    private String battery;

    @Column(name = "WARRANTY", length = 100)
    private String warranty;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @OneToMany(mappedBy = "phone", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PhoneVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "phone", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<PhoneImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "phone")
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();
}
