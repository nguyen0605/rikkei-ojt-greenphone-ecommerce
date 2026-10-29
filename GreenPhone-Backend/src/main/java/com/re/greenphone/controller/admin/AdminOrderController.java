package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.service.admin.AdminOrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@Tag(name = "Admin - Order", description = "Admin order management")
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.getOrders(status, search, pageRequest)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.getOrderDetail(id)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.updateStatus(id, body.get("status"))));
    }

    @PutMapping("/{id}/payment-status")
    public ResponseEntity<ApiResponse<?>> updatePaymentStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.updatePaymentStatus(id, body.get("paymentStatus"))));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<?>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.confirmOrder(id)));
    }

    @PutMapping("/{id}/delivery")
    public ResponseEntity<ApiResponse<?>> updateDeliveryStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminOrderService.updateDeliveryStatus(id, body.get("status"))));
    }
}
