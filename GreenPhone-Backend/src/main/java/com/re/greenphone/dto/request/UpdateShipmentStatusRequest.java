package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateShipmentStatusRequest {

    @NotBlank(message = "Shipment status is required")
    private String status; // PICKED_UP, DELIVERING, DELIVERED, RETURNED, FAILED

    private String hubLocation;

    private String shipperNote;
}
