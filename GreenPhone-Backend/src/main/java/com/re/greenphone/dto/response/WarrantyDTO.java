package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarrantyDTO {
    private Long id;
    private Long orderId;
    private Long phoneVariantId;
    private String phoneName;
    private String variantDetails;
    private String imeiNumber;
    private String customerName;
    private String customerPhone;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
    private String note;
}
