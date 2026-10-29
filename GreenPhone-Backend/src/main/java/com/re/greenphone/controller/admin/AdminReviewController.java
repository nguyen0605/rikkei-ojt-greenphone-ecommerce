package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.service.admin.AdminReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Tag(name = "Admin - Review", description = "Admin review moderation")
public class AdminReviewController {

    private final AdminReviewService adminReviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer rating,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminReviewService.getReviews(status, rating, pageRequest)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminReviewService.updateStatus(id, body.get("status"))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        adminReviewService.deleteReview(id);
        return ResponseEntity.ok(ApiResponse.success("Review deleted"));
    }
}
