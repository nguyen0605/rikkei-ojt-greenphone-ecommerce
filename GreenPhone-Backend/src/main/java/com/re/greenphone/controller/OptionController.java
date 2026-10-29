package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.service.OptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/options")
@RequiredArgsConstructor
@Tag(name = "Option", description = "Public option catalog (filter categories + items)")
public class OptionController {

    private final OptionService optionService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getCatalog() {
        return ResponseEntity.ok(ApiResponse.success(optionService.getCatalog()));
    }
}
