package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderCreationResult;
import com.re.greenphone.service.OrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order", description = "Order endpoints")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getOrders(PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrders(pageRequest)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        OrderCreationResult result = orderService.createOrderWithIdempotency(request, idempotencyKey);
        if (result.isNewlyCreated()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(result.getOrder()));
        } else {
            return ResponseEntity.ok(ApiResponse.success(result.getOrder()));
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<?>> cancel(
            @PathVariable Long id,
            @RequestBody(required = false) com.re.greenphone.dto.request.CancelOrderRequest request) {
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(orderService.cancelOrder(id, reason)));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<?>> cancelPut(
            @PathVariable Long id,
            @RequestBody(required = false) com.re.greenphone.dto.request.CancelOrderRequest request) {
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(orderService.cancelOrder(id, reason)));
    }

    @PutMapping("/{id}/promotion")
    public ResponseEntity<ApiResponse<?>> applyPromotion(@PathVariable Long id, @RequestBody java.util.Map<String, Long> body) {
        return ResponseEntity.ok(ApiResponse.success(orderService.applyPromotionToOrder(id, body.get("userPromotionId"))));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<?>> getHistory(PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderHistory(pageRequest)));
    }
}
