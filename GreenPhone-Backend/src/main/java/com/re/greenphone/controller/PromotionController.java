package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.service.PromotionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotion", description = "Promotion endpoints")
public class PromotionController {

    private final PromotionService promotionService;

    /**
     * Public: guest can view active promotions without logging in.
     */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<?>> getPublic() {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getPublicPromotions()));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<?>> getAvailable(@RequestParam(required = false) BigDecimal orderAmount) {
        return ResponseEntity.ok(ApiResponse.success(
                promotionService.getAvailablePromotions(orderAmount != null ? orderAmount : BigDecimal.ZERO)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<?>> getMyPromotions() {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getMyPromotions()));
    }

    @PostMapping("/claim")
    public ResponseEntity<ApiResponse<?>> claimPromotion(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(201).body(
                ApiResponse.created(promotionService.claimPromotion(body.get("code"))));
    }
}
