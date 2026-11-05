package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.InventoryStockMovementRequest;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
@Tag(name = "Admin - Inventory", description = "Admin inventory monitoring and history")
public class AdminInventoryController {

    private final InventoryStockHistoryService historyService;
    private final PhoneVariantMapper phoneVariantMapper;

    @PostMapping("/variants/{variantId}/movements")
    public ResponseEntity<ApiResponse<?>> applyMovement(
            @PathVariable Long variantId,
            @Valid @RequestBody InventoryStockMovementRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                phoneVariantMapper.toDto(historyService.applyMovement(variantId, request))));
    }

    @GetMapping("/variants/{variantId}/history")
    public ResponseEntity<ApiResponse<?>> getVariantHistory(@PathVariable Long variantId) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getHistory(variantId)));
    }
}
