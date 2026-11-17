package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.ReviewRequest;
import com.re.greenphone.service.R2StorageService;
import com.re.greenphone.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Review", description = "Review endpoints")
public class ReviewController {

    private final ReviewService reviewService;
    private final R2StorageService r2StorageService;

    @PostMapping(value = {"/images", "/images/upload"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải hình ảnh đánh giá lên Cloudflare R2")
    public ResponseEntity<ApiResponse<List<String>>> uploadImages(
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) List<MultipartFile> fileList) {
        List<MultipartFile> allFiles = new ArrayList<>();
        if (images != null) allFiles.addAll(images);
        if (fileList != null) allFiles.addAll(fileList);
        if (file != null) allFiles.add(file);

        if (allFiles.isEmpty()) {
            throw new BadRequestException("Danh sách ảnh tải lên không được để trống.");
        }
        if (allFiles.size() > 5) {
            throw new BadRequestException("Chỉ được tải lên tối đa 5 hình ảnh cho mỗi đánh giá.");
        }

        long maxSizeBytes = 5L * 1024 * 1024; // 5MB
        for (MultipartFile f : allFiles) {
            if (f != null && !f.isEmpty()) {
                if (f.getSize() > maxSizeBytes) {
                    throw new BadRequestException("Kích thước mỗi ảnh không được vượt quá 5MB.");
                }
                String contentType = f.getContentType();
                String originalFilename = f.getOriginalFilename();
                if (!isAllowedImage(contentType, originalFilename)) {
                    throw new BadRequestException("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng ảnh an toàn (JPG, PNG, WEBP).");
                }
            }
        }

        List<String> urls = new ArrayList<>();
        for (MultipartFile f : allFiles) {
            if (f != null && !f.isEmpty()) {
                urls.add(r2StorageService.uploadImage(f, "greenphone/reviews"));
            }
        }
        return ResponseEntity.ok(ApiResponse.success(urls, "Tải ảnh đánh giá lên Cloudflare R2 thành công"));
    }

    private boolean isAllowedImage(String contentType, String filename) {
        if (contentType != null) {
            String lowerType = contentType.toLowerCase();
            if (lowerType.equals("image/jpeg") || lowerType.equals("image/png")
                    || lowerType.equals("image/webp") || lowerType.equals("image/jpg")) {
                return true;
            }
        }
        if (filename != null) {
            String lowerName = filename.toLowerCase();
            return lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")
                    || lowerName.endsWith(".png") || lowerName.endsWith(".webp");
        }
        return false;
    }

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
