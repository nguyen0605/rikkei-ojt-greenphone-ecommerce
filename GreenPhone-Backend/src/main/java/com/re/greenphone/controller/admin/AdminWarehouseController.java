package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.WarehouseRequest;
import com.re.greenphone.dto.request.WarehouseStatusRequest;
import com.re.greenphone.dto.response.WarehouseResponse;
import com.re.greenphone.service.admin.AdminWarehouseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warehouses")
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE')")
@RequiredArgsConstructor
@Tag(name = "Admin - Warehouse", description = "Warehouse directory management; deactivate instead of deleting")
public class AdminWarehouseController {
    private final AdminWarehouseService service;

    @GetMapping
    @Operation(summary = "List all warehouses, including inactive branches")
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.getAll()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get warehouse details")
    public ResponseEntity<ApiResponse<WarehouseResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.getById(id)));
    }

    @PostMapping
    @Operation(summary = "Create an active warehouse with a unique code")
    public ResponseEntity<ApiResponse<WarehouseResponse>> create(@Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(service.create(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update warehouse code, name and address")
    public ResponseEntity<ApiResponse<WarehouseResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody WarehouseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate or deactivate a warehouse without deleting its data")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateStatus(@PathVariable Long id,
                                                                     @Valid @RequestBody WarehouseStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.updateStatus(id, request.status())));
    }
}
