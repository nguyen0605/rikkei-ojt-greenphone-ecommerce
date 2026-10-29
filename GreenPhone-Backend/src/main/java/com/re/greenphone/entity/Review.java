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
@Table(name = "REVIEW")
public class Review extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PHONE_ID", nullable = false)
    private Phone phone;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_DETAIL_ID", nullable = false, unique = true)
    private OrderDetail orderDetail;

    @Column(name = "RATING", nullable = false)
    private Integer rating;

    @Column(name = "CONTENT", columnDefinition = "TEXT")
    private String content;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "SHOW";
}
