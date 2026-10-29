package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.PromotionRequest;
import com.re.greenphone.service.admin.AdminPromotionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/promotions")
@RequiredArgsConstructor
@Tag(name = "Admin - Promotion", description = "Admin promotion management")
public class AdminPromotionController {

    private final AdminPromotionService adminPromotionService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminPromotionService.getPromotions(keyword, status, pageRequest)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminPromotionService.getPromotionDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminPromotionService.createPromotion(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Long id, @Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminPromotionService.updatePromotion(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        adminPromotionService.deletePromotion(id);
        return ResponseEntity.ok(ApiResponse.success("Promotion deleted"));
    }
}
