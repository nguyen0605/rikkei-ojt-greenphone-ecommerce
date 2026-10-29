package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.service.admin.AdminStatisticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
@Tag(name = "Admin - Statistics", description = "Admin dashboard statistics")
public class AdminStatisticsController {

    private final AdminStatisticsService adminStatisticsService;

    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<?>> getRevenue(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getRevenueStats(period, from, to)));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<?>> getOrderStats(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getOrderStats(from, to)));
    }

    @GetMapping("/top-selling")
    public ResponseEntity<ApiResponse<?>> getTopSelling(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getTopSellingPhones(limit, from, to)));
    }
}
