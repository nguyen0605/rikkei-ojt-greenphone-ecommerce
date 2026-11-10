package com.re.greenphone.dto.response;

import com.re.greenphone.enums.ClaimStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyClaimHistoryResponse {
    private Long id;
    private ClaimStatus fromStatus;
    private ClaimStatus toStatus;
    private String action;
    private String note;
    private String performedByName;
    private LocalDateTime createdAt;
}
