package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipmentDTO {
    private Long id;
    private Long orderId;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private String trackingNumber;
    private String carrierCode;
    private BigDecimal shippingFee;
    private BigDecimal codAmount;
    private String status;
    private LocalDateTime estimatedDeliveryAt;
    private LocalDateTime deliveredAt;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Builder.Default
    private List<ShipmentHistoryDTO> histories = new ArrayList<>();
}
