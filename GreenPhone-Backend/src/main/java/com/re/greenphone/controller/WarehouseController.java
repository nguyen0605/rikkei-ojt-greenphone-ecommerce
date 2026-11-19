package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.dto.response.NearestWarehouseStockResponse;
import com.re.greenphone.dto.response.WarehouseBranchStockResponse;
import com.re.greenphone.service.WarehouseRoutingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
@Tag(name = "Warehouse", description = "Public warehouse routing and lookup APIs")
public class WarehouseController {

    private final WarehouseRoutingService warehouseRoutingService;

    @Operation(summary = "Find nearest active warehouse to given delivery coordinates")
    @GetMapping("/nearest")
    public ApiResponse<NearestWarehouseResponse> getNearestWarehouse(
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng) {
        NearestWarehouseResponse response = warehouseRoutingService.findNearestWarehouse(lat, lng);
        return ApiResponse.success(response);
    }

    @Operation(summary = "Find nearest active warehouse and available stock for variants")
    @GetMapping("/nearest-stock")
    public ApiResponse<NearestWarehouseStockResponse> getNearestWarehouseStock(
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng,
            @RequestParam(value = "province", required = false) String province,
            @RequestParam(value = "variantIds", required = false) List<Long> variantIds) {
        NearestWarehouseStockResponse response = warehouseRoutingService.findNearestWarehouseStock(lat, lng, province, variantIds);
        return ApiResponse.success(response);
    }

    @Operation(summary = "Get branch stock list for a variant (CellphoneS style store lookup)")
    @GetMapping("/variant-stock/{variantId}")
    public ApiResponse<List<WarehouseBranchStockResponse>> getVariantBranchStocks(
            @PathVariable Long variantId,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng) {
        List<WarehouseBranchStockResponse> response = warehouseRoutingService.getBranchStocksForVariant(variantId, lat, lng);
        return ApiResponse.success(response);
    }
}

