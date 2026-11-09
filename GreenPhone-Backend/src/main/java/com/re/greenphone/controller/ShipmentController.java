package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
@Tag(name = "Shipment Tracking", description = "API tra cứu vận đơn dành cho khách hàng")
public class ShipmentController {

    private final ShipmentService shipmentService;

    @GetMapping("/track/{trackingNumber}")
    @Operation(summary = "Tra cứu hành trình vận đơn theo mã tracking_number")
    public ResponseEntity<ApiResponse<ShipmentDTO>> trackByNumber(@PathVariable String trackingNumber) {
        ShipmentDTO result = shipmentService.getShipmentByTrackingNumber(trackingNumber);
        return ResponseEntity.ok(ApiResponse.success(result, "Tra cứu vận đơn thành công"));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Lấy thông tin kiện hàng của đơn hàng")
    public ResponseEntity<ApiResponse<List<ShipmentDTO>>> getShipmentsByOrderId(@PathVariable Long orderId) {
        List<ShipmentDTO> result = shipmentService.getShipmentsByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}

