package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.PhoneRequest;
import com.re.greenphone.dto.request.PhoneVariantRequest;
import com.re.greenphone.service.admin.AdminPhoneService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/phones")
@RequiredArgsConstructor
@Tag(name = "Admin - Phone", description = "Admin phone management")
public class AdminPhoneController {

    private final AdminPhoneService adminPhoneService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) String status,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPhoneService.getPhones(keyword, brandId, status, pageRequest)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.getPhoneDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody PhoneRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminPhoneService.createPhone(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Long id, @Valid @RequestBody PhoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.updatePhone(id, request)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.updateStatus(id, body.get("status"))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        adminPhoneService.deletePhone(id);
        return ResponseEntity.ok(ApiResponse.success("Phone deleted"));
    }

    // Variants
    @GetMapping("/{phoneId}/variants")
    public ResponseEntity<ApiResponse<?>> getVariants(@PathVariable Long phoneId) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.getVariants(phoneId)));
    }

    @PostMapping("/{phoneId}/variants")
    public ResponseEntity<ApiResponse<?>> addVariant(@PathVariable Long phoneId, @Valid @RequestBody PhoneVariantRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminPhoneService.addVariant(phoneId, request)));
    }

    @PutMapping("/{phoneId}/variants/{variantId}")
    public ResponseEntity<ApiResponse<?>> updateVariant(@PathVariable Long phoneId, @PathVariable Long variantId,
                                                         @Valid @RequestBody PhoneVariantRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.updateVariant(variantId, request)));
    }

    @DeleteMapping("/{phoneId}/variants/{variantId}")
    public ResponseEntity<ApiResponse<?>> deleteVariant(@PathVariable Long phoneId, @PathVariable Long variantId) {
        adminPhoneService.deleteVariant(variantId);
        return ResponseEntity.ok(ApiResponse.success("Variant deleted"));
    }

    // Images
    @GetMapping("/{phoneId}/images")
    public ResponseEntity<ApiResponse<?>> getImages(@PathVariable Long phoneId) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.getImages(phoneId)));
    }

    @PutMapping("/{phoneId}/images/reorder")
    public ResponseEntity<ApiResponse<?>> reorderImages(@PathVariable Long phoneId,
                                                        @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Long> imageIds = ((List<Number>) body.getOrDefault("imageIds", List.of()))
                .stream().map(Number::longValue).toList();
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.reorderImages(phoneId, imageIds)));
    }

    @PostMapping(value = "/{phoneId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<?>> addImage(@PathVariable Long phoneId, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminPhoneService.addImage(phoneId, file)));
    }

    @DeleteMapping("/{phoneId}/images/{imageId}")
    public ResponseEntity<ApiResponse<?>> deleteImage(@PathVariable Long phoneId, @PathVariable Long imageId) {
        adminPhoneService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.success("Image deleted"));
    }

    @PutMapping("/{phoneId}/images/{imageId}")
    public ResponseEntity<ApiResponse<?>> updateImage(@PathVariable Long phoneId, @PathVariable Long imageId,
                                                       @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(adminPhoneService.updateImage(imageId, body)));
    }
}
