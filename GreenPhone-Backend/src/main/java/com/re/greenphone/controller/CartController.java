package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.CartItemRequest;
import com.re.greenphone.service.CartService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Tag(name = "Cart", description = "Shopping cart endpoints")
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getCart() {
        return ResponseEntity.ok(ApiResponse.success(cartService.getCart()));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<?>> addItem(@Valid @RequestBody CartItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cartService.addItem(request)));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<?>> updateItem(@PathVariable Long itemId, @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(ApiResponse.success(cartService.updateItem(itemId, body.get("quantity"))));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<?>> removeItem(@PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.success(cartService.removeItem(itemId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<?>> clearCart() {
        cartService.clearCart();
        return ResponseEntity.ok(ApiResponse.success("Cart cleared"));
    }
}
