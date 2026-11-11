package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.UpdateClaimStatusRequest;
import com.re.greenphone.dto.request.WarrantyClaimCreateRequest;
import com.re.greenphone.dto.response.WarrantyClaimResponse;
import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.enums.HardwareIssueType;
import com.re.greenphone.service.WarrantyClaimService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminWarrantyClaimController Unit Tests")
class AdminWarrantyClaimControllerTest {

    @Mock
    private WarrantyClaimService warrantyClaimService;

    @InjectMocks
    private AdminWarrantyClaimController adminWarrantyClaimController;

    @Test
    @DisplayName("Admin tiếp nhận phiếu bảo hành mới thành công trả về HTTP 201 Created")
    void testCreateClaim_Success() {
        WarrantyClaimCreateRequest request = WarrantyClaimCreateRequest.builder()
                .imeiNumber("860123456789012")
                .hardwareIssueType(HardwareIssueType.SCREEN)
                .issueDescription("Màn hình bị sọc xanh")
                .repairCost(BigDecimal.ZERO)
                .receivedByName("KTV Nguyễn Văn A")
                .build();

        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .claimCode("RMA-20261111-A1B2")
                .imeiNumber("860123456789012")
                .hardwareIssueType(HardwareIssueType.SCREEN)
                .status(ClaimStatus.SUBMITTED)
                .isUnderWarranty(true)
                .repairCost(BigDecimal.ZERO)
                .build();

        when(warrantyClaimService.createClaim(any(WarrantyClaimCreateRequest.class))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<WarrantyClaimResponse>> responseEntity = adminWarrantyClaimController.createClaim(request);

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData().getClaimCode()).isEqualTo("RMA-20261111-A1B2");
        assertThat(responseEntity.getBody().getData().getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        verify(warrantyClaimService).createClaim(request);
    }

    @Test
    @DisplayName("Admin cập nhật trạng thái phiếu bảo hành thành công trả về HTTP 200 OK")
    void testUpdateStatus_Success() {
        UpdateClaimStatusRequest request = UpdateClaimStatusRequest.builder()
                .status(ClaimStatus.IN_INSPECTION)
                .resolution("Thay thế linh kiện màn hình chính hãng")
                .note("Đã nhận máy từ kho và chuyển KTV phần cứng")
                .performedByName("KTV Trần Văn B")
                .build();

        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .claimCode("RMA-20261111-A1B2")
                .status(ClaimStatus.IN_INSPECTION)
                .resolution("Thay thế linh kiện màn hình chính hãng")
                .build();

        when(warrantyClaimService.updateClaimStatus(
                eq(1L),
                eq(ClaimStatus.IN_INSPECTION),
                eq("Thay thế linh kiện màn hình chính hãng"),
                eq("Đã nhận máy từ kho và chuyển KTV phần cứng"),
                eq("KTV Trần Văn B")
        )).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<WarrantyClaimResponse>> responseEntity = adminWarrantyClaimController.updateStatus(1L, request);

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData().getStatus()).isEqualTo(ClaimStatus.IN_INSPECTION);
        verify(warrantyClaimService).updateClaimStatus(
                1L,
                ClaimStatus.IN_INSPECTION,
                "Thay thế linh kiện màn hình chính hãng",
                "Đã nhận máy từ kho và chuyển KTV phần cứng",
                "KTV Trần Văn B"
        );
    }

    @Test
    @DisplayName("Lấy danh sách tất cả phiếu bảo hành trả về HTTP 200 OK")
    void testGetAllClaims_Success() {
        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .claimCode("RMA-20261111-A1B2")
                .status(ClaimStatus.SUBMITTED)
                .build();

        when(warrantyClaimService.getAllClaims(null)).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<WarrantyClaimResponse>>> responseEntity = adminWarrantyClaimController.getAllClaims(null);

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("Lấy chi tiết phiếu bảo hành theo ID trả về HTTP 200 OK")
    void testGetById_Success() {
        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .claimCode("RMA-20261111-A1B2")
                .build();

        when(warrantyClaimService.getClaimById(1L)).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<WarrantyClaimResponse>> responseEntity = adminWarrantyClaimController.getById(1L);

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData().getClaimCode()).isEqualTo("RMA-20261111-A1B2");
    }

    @Test
    @DisplayName("Tra cứu phiếu bảo hành theo mã RMA trả về HTTP 200 OK")
    void testGetByCode_Success() {
        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .claimCode("RMA-20261111-A1B2")
                .build();

        when(warrantyClaimService.getClaimByCode("RMA-20261111-A1B2")).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<WarrantyClaimResponse>> responseEntity = adminWarrantyClaimController.getByCode("RMA-20261111-A1B2");

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData().getClaimCode()).isEqualTo("RMA-20261111-A1B2");
    }

    @Test
    @DisplayName("Tra cứu lịch sử bảo hành theo IMEI trả về HTTP 200 OK")
    void testGetByImei_Success() {
        WarrantyClaimResponse mockResponse = WarrantyClaimResponse.builder()
                .id(1L)
                .imeiNumber("860123456789012")
                .build();

        when(warrantyClaimService.getClaimsByImei("860123456789012")).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<WarrantyClaimResponse>>> responseEntity = adminWarrantyClaimController.getByImei("860123456789012");

        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getData()).hasSize(1);
    }
}
