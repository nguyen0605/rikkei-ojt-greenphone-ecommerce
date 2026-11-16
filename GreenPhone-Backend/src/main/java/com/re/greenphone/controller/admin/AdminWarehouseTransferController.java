package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.DispatchTransferRequest;
import com.re.greenphone.dto.request.ReceiveTransferRequest;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.service.WarehouseTransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/transfers", "/api/admin/transfers"})
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE')")
@RequiredArgsConstructor
@Tag(name = "Admin - Warehouse Transfer", description = "Quản lý điều chuyển hàng liên kho và gom đơn giao một lần (INV-08)")
public class AdminWarehouseTransferController {

    private final WarehouseTransferService warehouseTransferService;

    @GetMapping
    @Operation(summary = "Lấy danh sách phiếu điều chuyển có phân trang và bộ lọc")
    public ResponseEntity<ApiResponse<PageResponse<WarehouseTransferDTO>>> getTransfers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long sourceWarehouseId,
            @RequestParam(required = false) Long destinationWarehouseId,
            @RequestParam(required = false) Long orderId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                warehouseTransferService.getTransfers(status, sourceWarehouseId, destinationWarehouseId, orderId, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết phiếu điều chuyển theo ID")
    public ResponseEntity<ApiResponse<WarehouseTransferDTO>> getTransferById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(warehouseTransferService.getTransferById(id)));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Lấy danh sách phiếu điều chuyển theo mã đơn hàng")
    public ResponseEntity<ApiResponse<List<WarehouseTransferDTO>>> getTransfersByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(warehouseTransferService.getTransfersByOrderId(orderId)));
    }

    @PostMapping("/{id}/dispatch")
    @Operation(summary = "Xác nhận xuất kho điều chuyển từ kho nguồn")
    public ResponseEntity<ApiResponse<WarehouseTransferDTO>> dispatchTransfer(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) DispatchTransferRequest request) {
        WarehouseTransferDTO dto = warehouseTransferService.dispatchTransfer(id, request);
        return ResponseEntity.ok(ApiResponse.success(dto, "Xuất kho điều chuyển thành công"));
    }

    @PostMapping("/{id}/receive")
    @Operation(summary = "Xác nhận nhập kho tại kho đích")
    public ResponseEntity<ApiResponse<WarehouseTransferDTO>> receiveTransfer(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReceiveTransferRequest request) {
        WarehouseTransferDTO dto = warehouseTransferService.receiveTransfer(id, request);
        return ResponseEntity.ok(ApiResponse.success(dto, "Nhập kho điều chuyển thành công"));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Hủy phiếu điều chuyển khi còn ở trạng thái PENDING")
    public ResponseEntity<ApiResponse<WarehouseTransferDTO>> cancelTransfer(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        WarehouseTransferDTO dto = warehouseTransferService.cancelTransfer(id, reason);
        return ResponseEntity.ok(ApiResponse.success(dto, "Hủy phiếu điều chuyển thành công"));
    }
}

