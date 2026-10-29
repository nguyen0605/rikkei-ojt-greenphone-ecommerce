package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "USER_PROMOTION", uniqueConstraints = {
        @UniqueConstraint(name = "UQ_USER_PROMOTION", columnNames = {"USER_ID", "PROMOTION_ID"})
})
public class UserPromotion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "PROMOTION_ID", nullable = false)
    private Promotion promotion;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "RECEIVED_AT", nullable = false)
    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();

    @Column(name = "USED_AT")
    private LocalDateTime usedAt;
}
