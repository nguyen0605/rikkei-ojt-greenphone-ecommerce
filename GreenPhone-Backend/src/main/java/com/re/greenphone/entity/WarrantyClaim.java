package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.enums.HardwareIssueType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "warranty_claim")
public class WarrantyClaim extends BaseEntity {

    @Column(name = "claim_code", nullable = false, unique = true, length = 100)
    private String claimCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", nullable = false)
    private Warranty warranty;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ClaimStatus status = ClaimStatus.SUBMITTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "hardware_issue_type", nullable = false, length = 50)
    @Builder.Default
    private HardwareIssueType hardwareIssueType = HardwareIssueType.OTHER;

    @Column(name = "is_under_warranty", nullable = false)
    @Builder.Default
    private Boolean isUnderWarranty = true;

    @Column(name = "repair_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal repairCost = BigDecimal.ZERO;

    @Column(name = "resolution", length = 255)
    private String resolution;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "customer_note", length = 255)
    private String customerNote;

    @Column(name = "created_by_name", length = 100)
    private String createdByName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
