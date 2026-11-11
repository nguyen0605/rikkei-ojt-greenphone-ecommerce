package com.re.greenphone.dto.response;

import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.enums.ReturnType;
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
public class ReturnResponse {

    private Long id;
    private String returnCode;
    private Long orderId;
    private String orderTrackingNumber;
    private Long phoneVariantId;
    private String phoneName;
    private String variantSku;
    private Long userId;
    private String customerName;
    private String reason;
    private String errorDescription;
    private List<String> proofImages;
    private ReturnType type;
    private ReturnStatus status;
    private BigDecimal refundAmount;
    private String adminNote;
    private Long reviewedBy;
    private String reviewerName;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

