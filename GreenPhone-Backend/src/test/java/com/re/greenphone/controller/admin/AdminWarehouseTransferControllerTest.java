package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.DispatchTransferRequest;
import com.re.greenphone.dto.request.ReceiveTransferRequest;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.dto.response.WarehouseTransferItemDTO;
import com.re.greenphone.service.WarehouseTransferService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminWarehouseTransferController Unit Tests")
class AdminWarehouseTransferControllerTest {

    @Mock
    private WarehouseTransferService warehouseTransferService;

    @InjectMocks
    private AdminWarehouseTransferController controller;

    private WarehouseTransferDTO buildMockTransfer(Long id, String code, String status) {
        return WarehouseTransferDTO.builder()
                .id(id)
                .transferCode(code)
                .orderId(1001L)
                .sourceWarehouseId(1L)
                .sourceWarehouseName("Kho Hà Nội")
                .destinationWarehouseId(2L)
                .destinationWarehouseName("Kho TP.HCM")
                .status(status)
                .items(List.of(WarehouseTransferItemDTO.builder()
                        .id(1L)
                        .transferId(id)
                        .phoneVariantId(101L)
                        .productName("iPhone 15 Pro")
                        .requestedQuantity(2)
                        .dispatchedQuantity(status.equals("PENDING") ? 0 : 2)
                        .receivedQuantity(status.equals("RECEIVED") ? 2 : 0)
                        .build()))
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/admin/transfers: Lấy danh sách phiếu điều chuyển có phân trang")
    void testGetTransfers() {
        Pageable pageable = PageRequest.of(0, 10);
        WarehouseTransferDTO dto = buildMockTransfer(1L, "TRF-001", "PENDING");
        PageResponse<WarehouseTransferDTO> pageResponse = new PageResponse<>(List.of(dto), 0, 10, 1L, 1, true);

        when(warehouseTransferService.getTransfers(isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                .thenReturn(pageResponse);

        ResponseEntity<ApiResponse<PageResponse<WarehouseTransferDTO>>> response = controller.getTransfers(null, null, null, null, pageable);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getContent()).hasSize(1);
        assertThat(response.getBody().getData().getContent().get(0).getTransferCode()).isEqualTo("TRF-001");
    }

    @Test
    @DisplayName("GET /api/v1/admin/transfers/{id}: Xem chi tiết phiếu điều chuyển")
    void testGetTransferById() {
        WarehouseTransferDTO dto = buildMockTransfer(1L, "TRF-001", "PENDING");
        when(warehouseTransferService.getTransferById(1L)).thenReturn(dto);

        ResponseEntity<ApiResponse<WarehouseTransferDTO>> response = controller.getTransferById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("POST /api/v1/admin/transfers/{id}/dispatch: Xuất kho điều chuyển thành công")
    void testDispatchTransfer() {
        WarehouseTransferDTO dto = buildMockTransfer(1L, "TRF-001", "DISPATCHED");
        DispatchTransferRequest req = new DispatchTransferRequest();
        when(warehouseTransferService.dispatchTransfer(eq(1L), any())).thenReturn(dto);

        ResponseEntity<ApiResponse<WarehouseTransferDTO>> response = controller.dispatchTransfer(1L, req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getStatus()).isEqualTo("DISPATCHED");
        verify(warehouseTransferService).dispatchTransfer(1L, req);
    }

    @Test
    @DisplayName("POST /api/v1/admin/transfers/{id}/receive: Nhập kho điều chuyển thành công")
    void testReceiveTransfer() {
        WarehouseTransferDTO dto = buildMockTransfer(1L, "TRF-001", "RECEIVED");
        ReceiveTransferRequest req = new ReceiveTransferRequest();
        when(warehouseTransferService.receiveTransfer(eq(1L), any())).thenReturn(dto);

        ResponseEntity<ApiResponse<WarehouseTransferDTO>> response = controller.receiveTransfer(1L, req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getStatus()).isEqualTo("RECEIVED");
        verify(warehouseTransferService).receiveTransfer(1L, req);
    }

    @Test
    @DisplayName("POST /api/v1/admin/transfers/{id}/cancel: Hủy phiếu điều chuyển thành công")
    void testCancelTransfer() {
        WarehouseTransferDTO dto = buildMockTransfer(1L, "TRF-001", "CANCELLED");
        when(warehouseTransferService.cancelTransfer(eq(1L), any())).thenReturn(dto);

        ResponseEntity<ApiResponse<WarehouseTransferDTO>> response = controller.cancelTransfer(1L, "Lý do hủy");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getStatus()).isEqualTo("CANCELLED");
        verify(warehouseTransferService).cancelTransfer(1L, "Lý do hủy");
    }
}

