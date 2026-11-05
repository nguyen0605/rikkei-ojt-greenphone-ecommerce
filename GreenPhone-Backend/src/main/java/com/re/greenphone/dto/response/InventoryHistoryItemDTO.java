package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryHistoryItemDTO {

    private Long id;
    private String changeType;
    private Integer quantityBefore;
    private Integer quantityChange;
    private Integer quantityAfter;
    private String reason;
    private Long changedByUserId;
    private String changedByName;
    private LocalDateTime createdAt;
}
