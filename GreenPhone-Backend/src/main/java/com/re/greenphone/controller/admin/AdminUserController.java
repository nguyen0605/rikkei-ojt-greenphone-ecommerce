package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.service.admin.AdminUserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin - User", description = "Admin user management")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getUsers(
            @RequestParam(required = false) String search, PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUsers(search, pageRequest)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUserDetail(id)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<?>> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.updateUserStatus(id, body.get("status"))));
    }
}
