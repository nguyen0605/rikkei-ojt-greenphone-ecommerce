package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.WarrantyResponse;
import com.re.greenphone.service.WarrantyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WarrantyController Unit Tests")
class WarrantyControllerTest {

    @Mock
    private WarrantyService warrantyService;

    @InjectMocks
    private WarrantyController warrantyController;

    @Test
    @DisplayName("API công khai checkWarranty: Tra cứu thông tin bảo hành trả về ApiResponse chuẩn 200")
    void checkWarranty_success() {
        WarrantyResponse response = WarrantyResponse.builder()
                .id(1L)
                .orderId(10L)
                .imei("861234567890128")
                .productName("iPhone 15 Pro Max")
                .customerName("Nguyễn Văn A")
                .customerPhone("0987654321")
                .startDate(LocalDateTime.now().minusDays(10))
                .endDate(LocalDateTime.now().plusMonths(12))
                .status("ACTIVE")
                .remainingDays(355L)
                .warrantyDurationMonths(12)
                .build();

        when(warrantyService.searchWarranties("0987654321")).thenReturn(List.of(response));

        ApiResponse<List<WarrantyResponse>> apiResponse = warrantyController.checkWarranty("0987654321");

        assertThat(apiResponse.getCode()).isEqualTo(200);
        assertThat(apiResponse.getMessage()).contains("thành công");
        assertThat(apiResponse.getData()).hasSize(1);
        assertThat(apiResponse.getData().get(0).getImei()).isEqualTo("861234567890128");
        assertThat(apiResponse.getData().get(0).getCustomerPhone()).isEqualTo("0987654321");
        verify(warrantyService).searchWarranties("0987654321");
    }

    @Test
    @DisplayName("API getWarrantyByImei: Tra cứu chi tiết bảo hành theo IMEI trả về đúng dữ liệu")
    void getWarrantyByImei_success() {
        WarrantyResponse response = WarrantyResponse.builder()
                .id(1L)
                .orderId(10L)
                .imei("861234567890128")
                .productName("iPhone 15 Pro Max")
                .status("ACTIVE")
                .build();

        when(warrantyService.getWarrantyByImei("861234567890128")).thenReturn(response);

        ApiResponse<WarrantyResponse> apiResponse = warrantyController.getWarrantyByImei("861234567890128");

        assertThat(apiResponse.getCode()).isEqualTo(200);
        assertThat(apiResponse.getData().getImei()).isEqualTo("861234567890128");
        verify(warrantyService).getWarrantyByImei("861234567890128");
    }
}
