package com.re.greenphone.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "order_histories")
@EntityListeners(AuditingEntityListener.class)
public class OrderHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 30)
    private String toStatus;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

