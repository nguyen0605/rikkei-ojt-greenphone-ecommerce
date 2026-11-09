package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateShipmentRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotBlank(message = "Carrier code is required (e.g. GHN, GHTK, VIETTEL_POST)")
    private String carrierCode;

    /**
     * Mã vận đơn. Nếu để trống, hệ thống sẽ tự sinh mã duy nhất theo cú pháp GP-SHP-<timestamp>-<random>.
     */
    private String trackingNumber;

    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal codAmount = BigDecimal.ZERO;

    private LocalDateTime estimatedDeliveryAt;

    private String note;

    private String hubLocation;
}
