package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.CreateShipmentRequest;
import com.re.greenphone.dto.request.UpdateShipmentStatusRequest;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/shipments", "/api/admin/shipments"})
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Shipment", description = "Quản lý điều phối giao vận, bưu cục & vận đơn")
public class AdminShipmentController {

    private final ShipmentService shipmentService;

    @PostMapping
    @Operation(summary = "Tạo kiện hàng mới cho đơn hàng (Yêu cầu đơn hàng ở trạng thái PROCESSING)")
    public ResponseEntity<ApiResponse<ShipmentDTO>> createShipment(@Valid @RequestBody CreateShipmentRequest request) {
        ShipmentDTO result = shipmentService.createShipment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(result));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái kiện hàng (Chuyển sang DELIVERED sẽ tự động chuyển Order sang COMPLETED và kích hoạt bảo hành)")
    public ResponseEntity<ApiResponse<ShipmentDTO>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipmentStatusRequest request) {
        ShipmentDTO result = shipmentService.updateShipmentStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Cập nhật trạng thái kiện hàng thành công"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết kiện hàng kèm toàn bộ lịch sử hành trình")
    public ResponseEntity<ApiResponse<ShipmentDTO>> getShipmentDetail(@PathVariable Long id) {
        ShipmentDTO result = shipmentService.getShipmentById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Lấy danh sách kiện hàng theo mã đơn hàng")
    public ResponseEntity<ApiResponse<List<ShipmentDTO>>> getShipmentsByOrderId(@PathVariable Long orderId) {
        List<ShipmentDTO> result = shipmentService.getShipmentsByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả kiện hàng phân trang")
    public ResponseEntity<ApiResponse<Page<ShipmentDTO>>> getAllShipments(Pageable pageable) {
        Page<ShipmentDTO> result = shipmentService.getAllShipments(pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}

