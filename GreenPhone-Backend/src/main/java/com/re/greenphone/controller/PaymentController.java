package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.service.PaymentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map; // used by createPayment body

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Payment endpoints")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createPayment(@RequestBody Map<String, Object> body) {
        Long orderId = Long.valueOf(body.get("orderId").toString());
        String method = (String) body.getOrDefault("method", "SEPAY");
        return ResponseEntity.ok(ApiResponse.success(paymentService.createPayment(orderId, method)));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<?>> getPayment(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPayment(orderId)));
    }

    @GetMapping("/qr/{orderId}")
    public ResponseEntity<ApiResponse<?>> getQRCode(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getQRCode(orderId)));
    }
}
