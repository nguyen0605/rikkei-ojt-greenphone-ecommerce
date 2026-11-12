package com.re.greenphone.controller.admin;
import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.PurchaseOrderRequest;
import com.re.greenphone.dto.response.PurchaseOrderResponse;
import com.re.greenphone.service.admin.AdminPurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
@RestController @RequestMapping("/api/v1/admin/purchase-orders") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AdminPurchaseOrderController {
    private final AdminPurchaseOrderService service;
    @GetMapping @Operation(summary="List purchase orders with status filter and pagination")
    public ApiResponse<Page<PurchaseOrderResponse>> list(@RequestParam(required=false) String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,
        @RequestParam(defaultValue="") String keyword,@RequestParam(required=false) Long supplierId,@RequestParam(required=false) Long warehouseId,@RequestParam(defaultValue="NEWEST") String sort) {
        return ApiResponse.success(service.filter(status,page,size,keyword,supplierId,warehouseId,sort));
    }
    @GetMapping("/{id}") @Operation(summary="Purchase order details and received quantities")
    public ApiResponse<PurchaseOrderResponse> detail(@PathVariable Long id) { return ApiResponse.success(service.detail(id)); }
    @PostMapping @Operation(summary="Create a draft or ordered purchase order")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(@Valid @RequestBody PurchaseOrderRequest request) { return ResponseEntity.status(201).body(ApiResponse.created(service.create(request))); }
    @PostMapping("/{id}/order") @Operation(summary="Place a draft purchase order")
    public ApiResponse<PurchaseOrderResponse> order(@PathVariable Long id) { return ApiResponse.success(service.order(id)); }
    @PutMapping("/{id}") @Operation(summary="Edit supplier, warehouse and items of a draft PO without changing stock")
    public ApiResponse<PurchaseOrderResponse> update(@PathVariable Long id,@Valid @RequestBody PurchaseOrderRequest request) { return ApiResponse.success(service.update(id,request)); }
    @PostMapping("/{id}/cancel") @Operation(summary="Cancel a draft/ordered PO without changing stock")
    public ApiResponse<PurchaseOrderResponse> cancel(@PathVariable Long id) { return ApiResponse.success(service.cancel(id)); }
    @PostMapping("/{id}/receive") @Operation(summary="Receive all items once into the target warehouse atomically")
    public ApiResponse<PurchaseOrderResponse> receive(@PathVariable Long id) { return ApiResponse.success(service.receive(id)); }
}
