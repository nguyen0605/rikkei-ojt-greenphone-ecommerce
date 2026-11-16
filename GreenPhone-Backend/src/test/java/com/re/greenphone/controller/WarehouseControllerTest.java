package com.re.greenphone.controller;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.service.WarehouseRoutingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class WarehouseControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WarehouseRoutingService warehouseRoutingService;

    @InjectMocks
    private WarehouseController warehouseController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(warehouseController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/warehouses/nearest với tọa độ TP.HCM trả về kho WH-HCM-Q1")
    void getNearestWarehouse_hcmCoordinates_returnsHcmWarehouse() throws Exception {
        NearestWarehouseResponse response = NearestWarehouseResponse.builder()
                .id(2L)
                .code("WH-HCM-Q1")
                .name("Kho Chi Nhánh TP.HCM")
                .address("Quận 1, TP. Hồ Chí Minh")
                .latitude(BigDecimal.valueOf(10.7769))
                .longitude(BigDecimal.valueOf(106.7009))
                .distanceKm(0.0)
                .status("ACTIVE")
                .build();

        when(warehouseRoutingService.findNearestWarehouse(eq(10.7769), eq(106.7009))).thenReturn(response);

        mockMvc.perform(get("/api/v1/warehouses/nearest")
                        .param("lat", "10.7769")
                        .param("lng", "106.7009")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.code").value("WH-HCM-Q1"))
                .andExpect(jsonPath("$.data.name").value("Kho Chi Nhánh TP.HCM"))
                .andExpect(jsonPath("$.data.distanceKm").value(0.0));
    }

    @Test
    @DisplayName("GET /api/v1/warehouses/nearest với tọa độ Hà Nội trả về kho WH-HN-MAIN")
    void getNearestWarehouse_hanoiCoordinates_returnsHanoiWarehouse() throws Exception {
        NearestWarehouseResponse response = NearestWarehouseResponse.builder()
                .id(1L)
                .code("WH-HN-MAIN")
                .name("Kho Tổng Hà Nội")
                .address("Tòa nhà FPT, Cầu Giấy, Hà Nội")
                .latitude(BigDecimal.valueOf(21.0285))
                .longitude(BigDecimal.valueOf(105.8542))
                .distanceKm(0.0)
                .status("ACTIVE")
                .build();

        when(warehouseRoutingService.findNearestWarehouse(eq(21.0285), eq(105.8542))).thenReturn(response);

        mockMvc.perform(get("/api/v1/warehouses/nearest")
                        .param("lat", "21.0285")
                        .param("lng", "105.8542")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.code").value("WH-HN-MAIN"))
                .andExpect(jsonPath("$.data.name").value("Kho Tổng Hà Nội"));
    }

    @Test
    @DisplayName("GET /api/v1/warehouses/nearest không truyền tọa độ trả về kho mặc định với distance null")
    void getNearestWarehouse_nullCoordinates_returnsDefaultWarehouse() throws Exception {
        NearestWarehouseResponse response = NearestWarehouseResponse.builder()
                .id(1L)
                .code("WH-HN-MAIN")
                .name("Kho Tổng Hà Nội")
                .address("Tòa nhà FPT, Cầu Giấy, Hà Nội")
                .latitude(BigDecimal.valueOf(21.0285))
                .longitude(BigDecimal.valueOf(105.8542))
                .distanceKm(null)
                .status("ACTIVE")
                .build();

        when(warehouseRoutingService.findNearestWarehouse(null, null)).thenReturn(response);

        mockMvc.perform(get("/api/v1/warehouses/nearest")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.code").value("WH-HN-MAIN"))
                .andExpect(jsonPath("$.data.distanceKm").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/v1/warehouses/nearest với tọa độ không hợp lệ trả về lỗi 400")
    void getNearestWarehouse_invalidCoordinates_returnsBadRequest() throws Exception {
        when(warehouseRoutingService.findNearestWarehouse(eq(95.0), eq(105.0)))
                .thenThrow(new BadRequestException("Vĩ độ (latitude) phải nằm trong khoảng [-90, 90]"));

        mockMvc.perform(get("/api/v1/warehouses/nearest")
                        .param("lat", "95.0")
                        .param("lng", "105.0")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Vĩ độ (latitude) phải nằm trong khoảng [-90, 90]"));
    }
}

