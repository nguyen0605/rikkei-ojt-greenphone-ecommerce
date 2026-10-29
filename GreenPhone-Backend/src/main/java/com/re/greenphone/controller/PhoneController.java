package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.service.PhoneService;
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
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getPhoneDetail(id)));
    }

    @GetMapping("/search")
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
    public ResponseEntity<ApiResponse<?>> getFilters() {
        return ResponseEntity.ok(ApiResponse.success(phoneService.getFilters()));
    }
}
