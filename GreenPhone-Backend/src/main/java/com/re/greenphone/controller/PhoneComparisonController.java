package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.PhoneComparisonResponse;
import com.re.greenphone.service.PhoneComparisonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/phones", "/api/phones"})
@RequiredArgsConstructor
@Tag(name = "Phone Comparison", description = "Endpoints for comparing phone specifications")
public class PhoneComparisonController {

    private final PhoneComparisonService phoneComparisonService;

    @Operation(summary = "Compare specifications of multiple phones")
    @GetMapping("/compare")
    public ResponseEntity<ApiResponse<PhoneComparisonResponse>> comparePhones(
            @Parameter(description = "Danh sách ID điện thoại cần so sánh (ví dụ: ?ids=1,2)", required = true)
            @RequestParam("ids") List<Long> ids) {
        PhoneComparisonResponse response = phoneComparisonService.comparePhones(ids);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
