package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.service.admin.AdminStatisticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
@Tag(name = "Admin - Statistics", description = "Admin dashboard statistics")
public class AdminStatisticsController {

    private final AdminStatisticsService adminStatisticsService;

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<?>> invalidParameter() {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, "Invalid report parameter or timestamp"));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SALES', 'MARKETING')")
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<?>> getRevenue(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getRevenueStats(period, from, to)));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SALES', 'WAREHOUSE', 'MARKETING')")
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<?>> getOrderStats(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getOrderStats(from, to)));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SALES', 'WAREHOUSE', 'MARKETING')")
    @GetMapping("/top-selling")
    public ResponseEntity<ApiResponse<?>> getTopSelling(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getTopSellingPhones(limit, from, to)));
    }
    @GetMapping("/financial-report")
    @PreAuthorize("hasRole('ADMIN')")
    @io.swagger.v3.oas.annotations.Operation(summary = "Financial report; end boundary exclusive, maximum 366 days")
    public ResponseEntity<ApiResponse<com.re.greenphone.dto.response.FinancialReportDTO>> financialReport(
            @RequestParam(defaultValue="month") String period,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.success(adminStatisticsService.getFinancialReport(period,from,to)));
    }
}
