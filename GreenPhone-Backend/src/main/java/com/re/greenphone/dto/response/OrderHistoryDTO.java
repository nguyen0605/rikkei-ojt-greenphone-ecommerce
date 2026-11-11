package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderHistoryDTO {
    private Long id;
    private Long orderId;
    private String fromStatus;
    private String toStatus;
    private String note;
    private String changedBy;
    private LocalDateTime createdAt;
}

