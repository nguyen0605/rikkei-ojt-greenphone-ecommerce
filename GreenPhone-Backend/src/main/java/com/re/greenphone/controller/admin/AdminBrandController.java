package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.BrandRequest;
import com.re.greenphone.service.admin.AdminBrandService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/brands")
@RequiredArgsConstructor
@Tag(name = "Admin - Brand", description = "Admin brand management")
public class AdminBrandController {

    private final AdminBrandService adminBrandService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getAll(
            @RequestParam(required = false) String keyword,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminBrandService.getBrands(keyword, pageRequest)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> create(@Valid @RequestBody BrandRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminBrandService.createBrand(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> update(@PathVariable Long id, @Valid @RequestBody BrandRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminBrandService.updateBrand(id, request)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminBrandService.updateStatus(id, body.get("status"))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> delete(@PathVariable Long id) {
        adminBrandService.deleteBrand(id);
        return ResponseEntity.ok(ApiResponse.success("Brand deleted"));
    }
}
