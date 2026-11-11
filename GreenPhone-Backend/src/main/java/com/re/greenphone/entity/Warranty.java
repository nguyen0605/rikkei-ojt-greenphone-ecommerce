package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "warranty")
public class Warranty extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phone_variant_id", nullable = false)
    private PhoneVariant phoneVariant;

    @Column(name = "imei_number", nullable = false, unique = true, length = 50)
    private String imeiNumber;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, EXPIRED, VOID

    @Column(name = "note", length = 255)
    private String note;

    public String getImei() {
        return this.imeiNumber;
    }

    public void setImei(String imei) {
        this.imeiNumber = imei;
    }

    public int getWarrantyDurationMonths() {
        if (startDate != null && endDate != null) {
            long months = ChronoUnit.MONTHS.between(startDate.toLocalDate(), endDate.toLocalDate());
            return (int) Math.max(1, months);
        }
        return 12;
    }
}
