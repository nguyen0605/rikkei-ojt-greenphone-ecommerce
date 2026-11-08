package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.CartItemRequest;
import com.re.greenphone.dto.request.CartSyncRequest;
import com.re.greenphone.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
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
    @Operation(summary = "Get current user's shopping cart")
    public ResponseEntity<ApiResponse<?>> getCart() {
        return ResponseEntity.ok(ApiResponse.success(cartService.getCart()));
    }

    @PostMapping("/sync")
    @Operation(summary = "BE2-01: Sync and merge client guest cart with user database cart")
    public ResponseEntity<ApiResponse<?>> syncCart(@Valid @RequestBody CartSyncRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cartService.syncCart(request)));
    }

    @PostMapping("/items")
    @Operation(summary = "Add an item to the shopping cart")
    public ResponseEntity<ApiResponse<?>> addItem(@Valid @RequestBody CartItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cartService.addItem(request)));
    }

    @PutMapping("/items/{itemId}")
    @Operation(summary = "Update quantity of a cart item")
    public ResponseEntity<ApiResponse<?>> updateItem(@PathVariable Long itemId, @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(ApiResponse.success(cartService.updateItem(itemId, body.get("quantity"))));
    }

    @DeleteMapping("/items/{itemId}")
    @Operation(summary = "Remove an item from the shopping cart")
    public ResponseEntity<ApiResponse<?>> removeItem(@PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.success(cartService.removeItem(itemId)));
    }

    @DeleteMapping
    @Operation(summary = "Clear all items from current user's shopping cart")
    public ResponseEntity<ApiResponse<?>> clearCart() {
        cartService.clearCart();
        return ResponseEntity.ok(ApiResponse.success("Cart cleared"));
    }
}
