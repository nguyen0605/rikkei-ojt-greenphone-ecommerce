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
@Table(name = "BANNER")
public class Banner extends BaseEntity {

    @Column(name = "TITLE", nullable = false, length = 150)
    private String title;

    @Column(name = "IMAGE_URL", nullable = false, length = 255)
    private String imageUrl;

    @Column(name = "LINK_URL", length = 255)
    private String linkUrl;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";
}
