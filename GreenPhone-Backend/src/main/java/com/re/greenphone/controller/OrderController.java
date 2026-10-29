package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.service.OrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody OrderRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(orderService.createOrder(request)));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<?>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.cancelOrder(id)));
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
