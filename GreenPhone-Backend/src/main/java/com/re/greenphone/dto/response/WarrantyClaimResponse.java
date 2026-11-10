package com.re.greenphone.dto.response;

import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.enums.HardwareIssueType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyClaimResponse {
    private Long id;
    private String claimCode;
    private Long warrantyId;
    private String imeiNumber;
    private String productName;
    private String customerName;
    private String customerPhone;
    private HardwareIssueType hardwareIssueType;
    private String issueDescription;
    private ClaimStatus status;
    private Boolean isUnderWarranty;
    private BigDecimal repairCost;
    private String resolution;
    private String rejectionReason;
    private String customerNote;
    private String createdByName;
    private String receivedByName;
    private LocalDateTime receivedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime warrantyEndDate;
    private String warrantyStatus;
    private List<WarrantyClaimHistoryResponse> histories;
}
