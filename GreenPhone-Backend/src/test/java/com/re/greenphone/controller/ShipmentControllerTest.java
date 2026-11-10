package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.dto.response.ShipmentHistoryDTO;
import com.re.greenphone.service.ShipmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ShipmentController Unit Tests")
class ShipmentControllerTest {

    @Mock
    private ShipmentService shipmentService;

    @InjectMocks
    private ShipmentController shipmentController;

    @Test
    @DisplayName("Tra cứu vận đơn công khai theo trackingNumber thành công không yêu cầu token")
    void testTrackByNumber_Success() {
        String trackingNumber = "GP-20261110-AB123";
        ShipmentHistoryDTO history = ShipmentHistoryDTO.builder()
                .id(1L)
                .status("READY_TO_SHIP")
                .hubLocation("Kho Tổng GreenPhone")
                .shipperNote("Kiện hàng đã được đóng gói")
                .createdAt(LocalDateTime.now())
                .build();

        ShipmentDTO shipmentDTO = ShipmentDTO.builder()
                .id(10L)
                .orderId(100L)
                .trackingNumber(trackingNumber)
                .carrierCode("GHN")
                .shippingFee(BigDecimal.valueOf(30000))
                .status("READY_TO_SHIP")
                .histories(List.of(history))
                .build();

        when(shipmentService.getShipmentByTrackingNumber(trackingNumber)).thenReturn(shipmentDTO);

        ResponseEntity<ApiResponse<ShipmentDTO>> response = shipmentController.trackByNumber(trackingNumber);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isNotNull();
        assertThat(response.getBody().getData().getTrackingNumber()).isEqualTo(trackingNumber);
        assertThat(response.getBody().getData().getHistories()).hasSize(1);
        verify(shipmentService).getShipmentByTrackingNumber(trackingNumber);
    }

    @Test
    @DisplayName("Lấy danh sách kiện hàng theo orderId thành công")
    void testGetShipmentsByOrderId_Success() {
        Long orderId = 88L;
        ShipmentDTO shipmentDTO = ShipmentDTO.builder()
                .id(10L)
                .orderId(orderId)
                .trackingNumber("GP-20261110-XYZ99")
                .carrierCode("GHTK")
                .status("DELIVERING")
                .build();

        when(shipmentService.getShipmentsByOrderId(orderId)).thenReturn(List.of(shipmentDTO));

        ResponseEntity<ApiResponse<List<ShipmentDTO>>> response = shipmentController.getShipmentsByOrderId(orderId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getOrderId()).isEqualTo(orderId);
        verify(shipmentService).getShipmentsByOrderId(orderId);
    }
}
