package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.service.PhoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/phones")
@RequiredArgsConstructor
@Tag(name = "Phone", description = "Phone product endpoints")
public class PhoneController {

    private final PhoneService phoneService;

    @GetMapping
    @Operation(summary = "Get list of active phones with filters and pagination")
    public ResponseEntity<ApiResponse<?>> getPhones(
            @RequestParam(required = false) List<Long> brandIds,
            @RequestParam(required = false) List<String> rams,
            @RequestParam(required = false) List<String> storages,
            @RequestParam(required = false) List<String> colors,
            @RequestParam(required = false) List<String> features,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String sort,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                phoneService.getPhones(brandIds, rams, storages, colors, features, minPrice, maxPrice, sort, pageRequest)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full phone specifications, images, and variant matrix by ID")
    public ResponseEntity<ApiResponse<PhoneDetailDTO>> getDetail(
            @Parameter(description = "Phone ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getPhoneDetail(id)));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get full phone specifications, images, and variant matrix by URL slug")
    public ResponseEntity<ApiResponse<PhoneDetailDTO>> getDetailBySlug(
            @Parameter(description = "Phone URL slug", example = "iphone-15-pro-max") @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getPhoneDetailBySlug(slug)));
    }

    @GetMapping("/{id}/variants")
    @Operation(summary = "Get realtime stock and configuration variants for a phone")
    public ResponseEntity<ApiResponse<List<PhoneVariantDTO>>> getVariants(
            @Parameter(description = "Phone ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getPhoneVariants(id)));
    }

    @GetMapping("/search")
    @Operation(summary = "Search phones by keyword with filters")
    public ResponseEntity<ApiResponse<?>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> brandIds,
            @RequestParam(required = false) List<String> rams,
            @RequestParam(required = false) List<String> storages,
            @RequestParam(required = false) List<String> colors,
            @RequestParam(required = false) List<String> features,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String sort,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                phoneService.search(q, brandIds, rams, storages, colors, features, minPrice, maxPrice, sort, pageRequest)));
    }

    @GetMapping("/filters")
    @Operation(summary = "Get available filter metadata")
    public ResponseEntity<ApiResponse<?>> getFilters() {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getFilters()));
    }
}
