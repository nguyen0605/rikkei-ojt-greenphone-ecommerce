package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.BannerRequest;
import com.re.greenphone.service.admin.AdminBannerService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@Tag(name = "Admin - Banner", description = "Admin banner management")
public class AdminBannerController {

    private final AdminBannerService adminBannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(
            @RequestParam(required = false) String title,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminBannerService.getBanners(title, pageRequest)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody BannerRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminBannerService.createBanner(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Long id, @Valid @RequestBody BannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminBannerService.updateBanner(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        adminBannerService.deleteBanner(id);
        return ResponseEntity.ok(ApiResponse.success("Banner deleted"));
    }
}
