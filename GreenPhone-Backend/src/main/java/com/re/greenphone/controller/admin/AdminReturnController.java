package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.ReturnReviewRequest;
import com.re.greenphone.dto.response.ReturnResponse;
import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.service.ReturnRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

// [WAR-04] Controller quản trị phê duyệt hoặc từ chối yêu cầu đổi trả / hoàn tiền dành cho Admin & Thủ kho
@RestController
@RequestMapping("/api/admin/returns")
@PreAuthorize("hasAnyRole('ADMIN', 'SALES', 'WAREHOUSE')")
@RequiredArgsConstructor
@Tag(name = "Admin Return & Refund", description = "Quản lý và phê duyệt yêu cầu đổi trả, hoàn tiền của khách hàng")
public class AdminReturnController {

    private final ReturnRequestService returnRequestService;

    // Lấy danh sách yêu cầu đổi trả có phân trang, lọc theo trạng thái và tìm kiếm
    @GetMapping
    @Operation(summary = "Lấy danh sách yêu cầu đổi trả (phân trang, lọc theo trạng thái và từ khóa tìm kiếm)")
    public ResponseEntity<ApiResponse<PageResponse<ReturnResponse>>> getAdminReturnRequests(
            @RequestParam(required = false) ReturnStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        String resolvedKeyword = (keyword != null && !keyword.isBlank()) ? keyword : search;
        Page<ReturnResponse> page = returnRequestService.getAdminReturnRequests(status, resolvedKeyword, pageable);
        PageResponse<ReturnResponse> response = new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Xem chi tiết yêu cầu đổi trả
    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết yêu cầu đổi trả")
    public ResponseEntity<ApiResponse<ReturnResponse>> getReturnDetail(@PathVariable Long id) {
        ReturnResponse detail = returnRequestService.getReturnDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    // Phê duyệt yêu cầu: Trừ kho gửi máy mới (EXCHANGE) hoặc kích hoạt hoàn tiền (REFUND)
    @PutMapping("/{id}/approve")
    @Operation(summary = "Phê duyệt yêu cầu: Trừ kho đổi máy mới (EXCHANGE) hoặc tạo hoàn tiền (REFUND)")
    public ResponseEntity<ApiResponse<ReturnResponse>> approveReturn(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReturnReviewRequest request) {
        ReturnResponse response = returnRequestService.approveReturn(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Phê duyệt yêu cầu đổi trả thành công"));
    }

    // Từ chối yêu cầu đổi trả (yêu cầu cung cấp lý do từ chối)
    @PutMapping("/{id}/reject")
    @Operation(summary = "Từ chối yêu cầu đổi trả")
    public ResponseEntity<ApiResponse<ReturnResponse>> rejectReturn(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReturnReviewRequest request) {
        ReturnResponse response = returnRequestService.rejectReturn(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Đã từ chối yêu cầu đổi trả"));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Xác nhận hoàn tất quy trình đổi trả (đã bàn giao máy mới hoặc chi trả hoàn tiền)")
    public ResponseEntity<ApiResponse<ReturnResponse>> completeReturn(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReturnReviewRequest request) {
        ReturnResponse response = returnRequestService.completeReturn(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Đã xác nhận hoàn tất yêu cầu đổi trả"));
    }
}
