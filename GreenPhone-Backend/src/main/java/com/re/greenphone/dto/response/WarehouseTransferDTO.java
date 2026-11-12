package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseTransferDTO {
    private Long id;
    private String transferCode;
    private Long orderId;
    private Long sourceWarehouseId;
    private String sourceWarehouseCode;
    private String sourceWarehouseName;
    private Long destinationWarehouseId;
    private String destinationWarehouseCode;
    private String destinationWarehouseName;
    private String status;
    private String note;
    private String createdBy;
    private String dispatchedBy;
    private String receivedBy;
    private LocalDateTime dispatchedAt;
    private LocalDateTime receivedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<WarehouseTransferItemDTO> items = new ArrayList<>();
}

