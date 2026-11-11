package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.CreateStaffRequest;
import com.re.greenphone.dto.request.UpdateStaffRoleRequest;
import com.re.greenphone.dto.request.UpdateStaffStatusRequest;
import com.re.greenphone.service.admin.AdminStaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@Tag(name = "Admin - Staff Management", description = "Quản lý đội ngũ nhân sự nội bộ và phân quyền vai trò")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStaffController {

    private final AdminStaffService adminStaffService;

    @GetMapping
    @Operation(summary = "Lấy danh sách nhân viên nội bộ (có phân trang và lọc theo vai trò)")
    public ResponseEntity<ApiResponse<?>> getStaffList(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminStaffService.getStaffList(search, role, pageRequest)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết thông tin tài khoản nhân viên")
    public ResponseEntity<ApiResponse<?>> getStaffDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminStaffService.getStaffDetail(id)));
    }

    @PostMapping
    @Operation(summary = "Tạo mới tài khoản nhân viên và gán vai trò nghiệp vụ")
    public ResponseEntity<ApiResponse<?>> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(adminStaffService.createStaff(request)));
    }

    @PutMapping("/{id}/role")
    @Operation(summary = "Điều chỉnh vai trò nghiệp vụ của nhân viên")
    public ResponseEntity<ApiResponse<?>> updateStaffRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffRoleRequest request,
            Authentication authentication) {
        String currentUsername = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(ApiResponse.success(adminStaffService.updateStaffRole(id, request, currentUsername)));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Khóa hoặc kích hoạt lại trạng thái hoạt động của nhân viên")
    public ResponseEntity<ApiResponse<?>> updateStaffStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffStatusRequest request,
            Authentication authentication) {
        String currentUsername = authentication != null ? authentication.getName() : null;
        String status = request != null ? request.getStatus() : null;
        return ResponseEntity.ok(ApiResponse.success(adminStaffService.updateStaffStatus(id, status, currentUsername)));
    }
}
