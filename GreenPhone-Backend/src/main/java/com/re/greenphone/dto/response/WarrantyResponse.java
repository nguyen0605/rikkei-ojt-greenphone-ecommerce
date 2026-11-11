package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyResponse {

    private Long id;
    private Long orderId;
    private Long phoneVariantId;
    private String imei;
    private String imeiNumber;
    private String productName;
    private String variantDetails;
    private String thumbnailUrl;
    private String customerName;
    private String customerPhone;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
    private Long remainingDays;
    private Integer warrantyDurationMonths;
    private String note;
}
