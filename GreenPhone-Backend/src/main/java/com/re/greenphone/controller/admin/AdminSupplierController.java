package com.re.greenphone.controller.admin;
import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.*;
import com.re.greenphone.dto.response.SupplierResponse;
import com.re.greenphone.service.admin.AdminSupplierService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
@RestController @RequestMapping("/api/v1/admin/suppliers") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AdminSupplierController {
    private final AdminSupplierService service;
    @GetMapping @Operation(summary="List/search suppliers by name, code or tax code")
    public ApiResponse<List<SupplierResponse>> list(@RequestParam(defaultValue="") String keyword) { return ApiResponse.success(service.list(keyword)); }
    @GetMapping("/{id}") @Operation(summary="Supplier details")
    public ApiResponse<SupplierResponse> detail(@PathVariable Long id) { return ApiResponse.success(service.detail(id)); }
    @PostMapping @Operation(summary="Create supplier")
    public ResponseEntity<ApiResponse<SupplierResponse>> create(@Valid @RequestBody SupplierRequest request) { return ResponseEntity.status(201).body(ApiResponse.created(service.create(request))); }
    @PutMapping("/{id}") @Operation(summary="Update supplier")
    public ApiResponse<SupplierResponse> update(@PathVariable Long id,@Valid @RequestBody SupplierRequest request) { return ApiResponse.success(service.update(id,request)); }
    @PatchMapping("/{id}/status") @Operation(summary="Activate/deactivate supplier without deleting purchase history")
    public ApiResponse<SupplierResponse> status(@PathVariable Long id,@Valid @RequestBody WarehouseStatusRequest request) { return ApiResponse.success(service.status(id,request.status())); }
}
