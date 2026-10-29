package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.ReviewRequest;
import com.re.greenphone.service.ReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Review", description = "Review endpoints")
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/phone/{phoneId}")
    public ResponseEntity<ApiResponse<?>> getByPhone(@PathVariable Long phoneId, PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getReviewsByPhoneId(phoneId, pageRequest)));
    }

    @GetMapping("/phone/{phoneId}/summary")
    public ResponseEntity<ApiResponse<?>> getSummary(@PathVariable Long phoneId) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getReviewSummary(phoneId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(reviewService.createReview(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.updateReview(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.ok(ApiResponse.success("Review deleted"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<?>> myReviews(PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getMyReviews(pageRequest)));
    }

    @GetMapping("/eligible")
    public ResponseEntity<ApiResponse<?>> eligible(PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(reviewService.getEligibleForReview(pageRequest)));
    }
}
