package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.CreateShipmentRequest;
import com.re.greenphone.dto.request.UpdateShipmentStatusRequest;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.dto.response.ShipmentHistoryDTO;
import com.re.greenphone.service.ShipmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminShipmentController Unit Tests")
class AdminShipmentControllerTest {

    @Mock
    private ShipmentService shipmentService;

    @InjectMocks
    private AdminShipmentController adminShipmentController;

    @Test
    @DisplayName("Admin tạo kiện hàng mới thành công trả về HTTP 201 Created")
    void testCreateShipment_Success() {
        CreateShipmentRequest request = CreateShipmentRequest.builder()
                .orderId(1L)
                .carrierCode("GHN")
                .shippingFee(BigDecimal.valueOf(35000))
                .codAmount(BigDecimal.valueOf(15000000))
                .hubLocation("Kho Tổng")
                .build();

        ShipmentDTO shipmentDTO = ShipmentDTO.builder()
                .id(101L)
                .orderId(1L)
                .trackingNumber("GP-20261110-12345")
                .carrierCode("GHN")
                .status("READY_TO_SHIP")
                .build();

        when(shipmentService.createShipment(request)).thenReturn(shipmentDTO);

        ResponseEntity<ApiResponse<ShipmentDTO>> response = adminShipmentController.createShipment(request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isNotNull();
        assertThat(response.getBody().getData().getId()).isEqualTo(101L);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("READY_TO_SHIP");
        verify(shipmentService).createShipment(request);
    }

    @Test
    @DisplayName("Admin cập nhật trạng thái kiện hàng thành công trả về HTTP 200 OK")
    void testUpdateStatus_Success() {
        Long shipmentId = 101L;
        UpdateShipmentStatusRequest request = UpdateShipmentStatusRequest.builder()
                .status("DELIVERED")
                .hubLocation("Bưu cục Hoàn Kiếm")
                .shipperNote("Đã giao thành công cho khách hàng")
                .build();

        ShipmentDTO shipmentDTO = ShipmentDTO.builder()
                .id(shipmentId)
                .orderId(1L)
                .status("DELIVERED")
                .deliveredAt(LocalDateTime.now())
                .histories(List.of(
                        ShipmentHistoryDTO.builder()
                                .status("DELIVERED")
                                .hubLocation("Bưu cục Hoàn Kiếm")
                                .shipperNote("Đã giao thành công cho khách hàng")
                                .build()
                ))
                .build();

        when(shipmentService.updateShipmentStatus(shipmentId, request)).thenReturn(shipmentDTO);

        ResponseEntity<ApiResponse<ShipmentDTO>> response = adminShipmentController.updateStatus(shipmentId, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isNotNull();
        assertThat(response.getBody().getData().getStatus()).isEqualTo("DELIVERED");
        verify(shipmentService).updateShipmentStatus(shipmentId, request);
    }

    @Test
    @DisplayName("Admin lấy chi tiết kiện hàng theo ID thành công")
    void testGetShipmentDetail_Success() {
        Long shipmentId = 101L;
        ShipmentDTO shipmentDTO = ShipmentDTO.builder()
                .id(shipmentId)
                .trackingNumber("GP-20261110-XYZ12")
                .status("DELIVERING")
                .build();

        when(shipmentService.getShipmentById(shipmentId)).thenReturn(shipmentDTO);

        ResponseEntity<ApiResponse<ShipmentDTO>> response = adminShipmentController.getShipmentDetail(shipmentId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getId()).isEqualTo(shipmentId);
        verify(shipmentService).getShipmentById(shipmentId);
    }

    @Test
    @DisplayName("Admin lấy danh sách phân trang kiện hàng thành công")
    void testGetAllShipments_Success() {
        PageRequest pageable = PageRequest.of(0, 10);
        ShipmentDTO shipmentDTO = ShipmentDTO.builder().id(101L).build();
        Page<ShipmentDTO> page = new PageImpl<>(List.of(shipmentDTO), pageable, 1);

        when(shipmentService.getAllShipments(pageable)).thenReturn(page);

        ResponseEntity<ApiResponse<Page<ShipmentDTO>>> response = adminShipmentController.getAllShipments(pageable);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getContent()).hasSize(1);
        verify(shipmentService).getAllShipments(pageable);
    }
}
