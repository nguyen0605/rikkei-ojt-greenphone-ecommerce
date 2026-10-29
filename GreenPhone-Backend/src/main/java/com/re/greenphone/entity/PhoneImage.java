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
@Table(name = "PHONE_IMAGE")
public class PhoneImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PHONE_ID", nullable = false)
    private Phone phone;

    @Column(name = "IMAGE_URL", nullable = false, length = 255)
    private String imageUrl;

    @Column(name = "IS_MAIN", nullable = false)
    @Builder.Default
    private Boolean isMain = false;

    @Column(name = "SORT_ORDER", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
