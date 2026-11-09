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
@Table(name = "WARRANTY")
public class Warranty extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_ID", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PHONE_VARIANT_ID", nullable = false)
    private PhoneVariant phoneVariant;

    @Column(name = "IMEI_NUMBER", nullable = false, unique = true, length = 50)
    private String imeiNumber;

    @Column(name = "CUSTOMER_NAME", nullable = false, length = 100)
    private String customerName;

    @Column(name = "CUSTOMER_PHONE", nullable = false, length = 20)
    private String customerPhone;

    @Column(name = "START_DATE", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "END_DATE", nullable = false)
    private LocalDateTime endDate;

    @Column(name = "STATUS", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, EXPIRED, VOIDED

    @Column(name = "NOTE", length = 255)
    private String note;
}
