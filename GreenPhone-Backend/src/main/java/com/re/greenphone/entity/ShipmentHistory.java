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
@Table(name = "SHIPMENT_HISTORY")
@EntityListeners(AuditingEntityListener.class)
public class ShipmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SHIPMENT_ID", nullable = false)
    private Shipment shipment;

    @Column(name = "STATUS", nullable = false, length = 30)
    private String status;

    @Column(name = "HUB_LOCATION", length = 255)
    private String hubLocation;

    @Column(name = "SHIPPER_NOTE", length = 255)
    private String shipperNote;

    @CreatedDate
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
