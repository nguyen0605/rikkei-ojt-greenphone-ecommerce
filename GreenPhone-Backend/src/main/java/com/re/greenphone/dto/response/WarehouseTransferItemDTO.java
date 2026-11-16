package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseTransferItemDTO {
    private Long id;
    private Long transferId;
    private Long phoneVariantId;
    private String productName;
    private String sku;
    private Integer requestedQuantity;
    private Integer dispatchedQuantity;
    private Integer receivedQuantity;
    private Integer inTransitQuantity;
}

