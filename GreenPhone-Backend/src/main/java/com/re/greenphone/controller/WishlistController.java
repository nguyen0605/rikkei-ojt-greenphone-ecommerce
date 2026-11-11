package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.WishlistAddRequest;
import com.re.greenphone.dto.response.WishlistItemResponse;
import com.re.greenphone.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/wishlist", "/api/wishlist"})
@RequiredArgsConstructor
@Tag(name = "Wishlist", description = "Wishlist management endpoints")
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    @Operation(summary = "Lấy danh sách sản phẩm yêu thích của người dùng đang đăng nhập")
    public ResponseEntity<ApiResponse<List<WishlistItemResponse>>> getWishlist() {
        return ResponseEntity.ok(ApiResponse.success(wishlistService.getWishlist()));
    }

    @PostMapping
    @Operation(summary = "Thêm sản phẩm vào danh sách yêu thích qua Request Body")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> addToWishlist(@Valid @RequestBody WishlistAddRequest request) {
        return ResponseEntity.ok(ApiResponse.success(wishlistService.addToWishlist(request)));
    }

    @PostMapping("/{phoneId}")
    @Operation(summary = "Thêm sản phẩm vào danh sách yêu thích qua Path Variable")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> addToWishlistByPath(@PathVariable Long phoneId) {
        return ResponseEntity.ok(ApiResponse.success(wishlistService.addToWishlist(phoneId)));
    }

    @DeleteMapping("/{phoneId}")
    @Operation(summary = "Xóa sản phẩm khỏi danh sách yêu thích")
    public ResponseEntity<ApiResponse<String>> removeFromWishlist(@PathVariable Long phoneId) {
        wishlistService.removeFromWishlist(phoneId);
        return ResponseEntity.ok(ApiResponse.success("Removed from wishlist"));
    }
}
