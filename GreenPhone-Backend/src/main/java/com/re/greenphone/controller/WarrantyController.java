package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.WarrantyResponse;
import com.re.greenphone.service.WarrantyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping({"/api/v1/warranties", "/api/warranties"})
@RequiredArgsConstructor
@Tag(name = "Warranty Controller", description = "Các API tra cứu và quản lý bảo hành điện tử theo số IMEI hoặc số điện thoại")
public class WarrantyController {

    private final WarrantyService warrantyService;

    @Operation(summary = "Tra cứu thông tin bảo hành điện tử công khai theo IMEI hoặc số điện thoại")
    @GetMapping("/check")
    public ApiResponse<List<WarrantyResponse>> checkWarranty(@RequestParam("query") String query) {
        log.info("Khách hàng tra cứu bảo hành với từ khóa: {}", query);
        List<WarrantyResponse> responses = warrantyService.searchWarranties(query);
        return ApiResponse.success(responses, "Tra cứu thông tin bảo hành thành công");
    }

    @Operation(summary = "Tra cứu chi tiết bảo hành điện tử theo mã IMEI duy nhất")
    @GetMapping("/imei/{imei}")
    public ApiResponse<WarrantyResponse> getWarrantyByImei(@PathVariable("imei") String imei) {
        log.info("Khách hàng tra cứu bảo hành theo IMEI: {}", imei);
        WarrantyResponse response = warrantyService.getWarrantyByImei(imei);
        return ApiResponse.success(response, "Tra cứu chi tiết bảo hành thành công");
    }
}
