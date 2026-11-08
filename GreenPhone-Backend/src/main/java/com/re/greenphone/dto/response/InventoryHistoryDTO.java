package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryHistoryDTO {

    private Long variantId;
    private Integer currentStock;
    private List<InventoryHistoryItemDTO> entries;
}
