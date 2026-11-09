package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipmentHistoryDTO {
    private Long id;
    private String status;
    private String hubLocation;
    private String shipperNote;
    private LocalDateTime createdAt;
}
