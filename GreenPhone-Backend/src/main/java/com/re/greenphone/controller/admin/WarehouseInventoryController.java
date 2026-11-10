package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.*;
import com.re.greenphone.dto.response.*;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.service.admin.WarehouseInventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/admin") @PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor @Tag(name = "Admin - Branch inventory")
public class WarehouseInventoryController {
    private final WarehouseInventoryService service;
    private final PhoneVariantMapper mapper;
    @GetMapping("/warehouses/{id}/stock") @Operation(summary = "Stock at a warehouse")
    public ApiResponse<List<WarehouseStockResponse>> stock(@PathVariable Long id) { return ApiResponse.success(service.stock(id)); }
    @GetMapping("/inventory/variants/{id}/warehouses") @Operation(summary = "Variant allocation across all warehouses")
    public ApiResponse<List<WarehouseStockResponse>> distribution(@PathVariable Long id) { return ApiResponse.success(service.distribution(id)); }
    @PostMapping("/warehouses/{id}/stock/movements") @Operation(summary = "Import or export at one active warehouse")
    public ApiResponse<PhoneVariantDTO> movement(@PathVariable Long id, @Valid @RequestBody WarehouseMovementRequest request) {
        return ApiResponse.success(mapper.toDto(service.movement(id, request)));
    }
    @PostMapping("/warehouses/{id}/stock/transfers") @Operation(summary = "Atomically transfer stock, preserving aggregate quantity")
    public ApiResponse<PhoneVariantDTO> transfer(@PathVariable Long id, @Valid @RequestBody WarehouseTransferRequest request) {
        return ApiResponse.success(mapper.toDto(service.transfer(id, request)));
    }
    @GetMapping("/warehouses/{id}/stock/history") @Operation(summary = "Most recent 100 warehouse movements")
    public ApiResponse<List<WarehouseStockHistoryResponse>> history(@PathVariable Long id, @RequestParam(required = false) Long variantId) {
        return ApiResponse.success(service.history(id, variantId));
    }
}
