package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.service.PromotionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotion", description = "Promotion endpoints")
public class PromotionController {

    private final PromotionService promotionService;
    private final PromotionRepository promotionRepository;

    /**
     * Public: guest can view active promotions without logging in.
     */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<?>> getPublic() {
        var now = LocalDateTime.now();
        var promos = promotionRepository.findAll().stream()
                .filter(p -> "ACTIVE".equals(p.getStatus())
                        && p.getStartDate().isBefore(now)
                        && p.getEndDate().isAfter(now))
                .sorted(Comparator.comparing(Promotion::getEndDate).reversed())
                .map(p -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", p.getId());
                    m.put("code", p.getCode());
                    m.put("name", p.getName());
                    m.put("description", p.getDescription());
                    m.put("discountType", p.getDiscountType());
                    m.put("discountValue", p.getDiscountValue());
                    m.put("maxDiscountAmount", p.getMaxDiscountAmount());
                    m.put("minOrderValue", p.getMinOrderValue());
                    m.put("startDate", p.getStartDate() != null ? p.getStartDate().toString() : null);
                    m.put("endDate", p.getEndDate() != null ? p.getEndDate().toString() : null);
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.success(promos));
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
