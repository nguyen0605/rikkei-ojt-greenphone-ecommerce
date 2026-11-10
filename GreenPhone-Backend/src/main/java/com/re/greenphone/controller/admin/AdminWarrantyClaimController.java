package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.WarrantyClaimCreateRequest;
import com.re.greenphone.dto.response.WarrantyClaimResponse;
import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.service.WarrantyClaimService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/warranty-claims", "/api/admin/warranty-claims"})
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin - Warranty Claims", description = "Quản lý tiếp nhận sửa chữa và bảo hành thiết bị theo IMEI")
public class AdminWarrantyClaimController {

    private final WarrantyClaimService warrantyClaimService;

    @PostMapping
    @Operation(summary = "Tiếp nhận phiếu sửa chữa bảo hành mới theo số IMEI")
    public ResponseEntity<ApiResponse<WarrantyClaimResponse>> createClaim(
            @Valid @RequestBody WarrantyClaimCreateRequest request) {
        WarrantyClaimResponse response = warrantyClaimService.createClaim(request);
        return ResponseEntity.status(201).body(ApiResponse.created(response));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách phiếu bảo hành (có thể lọc theo trạng thái)")
    public ResponseEntity<ApiResponse<List<WarrantyClaimResponse>>> getAllClaims(
            @RequestParam(required = false) ClaimStatus status) {
        return ResponseEntity.ok(ApiResponse.success(warrantyClaimService.getAllClaims(status)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết phiếu bảo hành theo ID")
    public ResponseEntity<ApiResponse<WarrantyClaimResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(warrantyClaimService.getClaimById(id)));
    }

    @GetMapping("/code/{claimCode}")
    @Operation(summary = "Tra cứu phiếu bảo hành theo mã tiếp nhận RMA")
    public ResponseEntity<ApiResponse<WarrantyClaimResponse>> getByCode(@PathVariable String claimCode) {
        return ResponseEntity.ok(ApiResponse.success(warrantyClaimService.getClaimByCode(claimCode)));
    }

    @GetMapping("/imei/{imeiNumber}")
    @Operation(summary = "Lấy toàn bộ lịch sử tiếp nhận bảo hành của một số IMEI")
    public ResponseEntity<ApiResponse<List<WarrantyClaimResponse>>> getByImei(@PathVariable String imeiNumber) {
        return ResponseEntity.ok(ApiResponse.success(warrantyClaimService.getClaimsByImei(imeiNumber)));
    }
}
