package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.response.DeviceSessionResponse;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.DeviceSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/account/devices")
@RequiredArgsConstructor
@Tag(name = "Account Devices", description = "Quản lý thiết bị và phiên đăng nhập của người dùng")
@PreAuthorize("isAuthenticated()")
public class DeviceSessionController {

    private final DeviceSessionService deviceSessionService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping
    @Operation(summary = "Lấy danh sách các thiết bị đang đăng nhập")
    public ResponseEntity<ApiResponse<List<DeviceSessionResponse>>> getActiveDevices(HttpServletRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long currentSessionId = resolveCurrentSessionId(request);

        List<DeviceSessionResponse> sessions = deviceSessionService.getActiveSessionsBySessionId(userId, currentSessionId);
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    @DeleteMapping("/{sessionId}")
    @Operation(summary = "Thu hồi một phiên làm việc cụ thể")
    public ResponseEntity<ApiResponse<String>> revokeSession(@PathVariable Long sessionId) {
        Long userId = SecurityUtils.getCurrentUserId();
        deviceSessionService.revokeSession(userId, sessionId);
        return ResponseEntity.ok(ApiResponse.success("Phiên đăng nhập đã được thu hồi thành công"));
    }

    @PostMapping("/revoke-others")
    @Operation(summary = "Đăng xuất tất cả các thiết bị khác, giữ lại phiên hiện tại")
    public ResponseEntity<ApiResponse<String>> revokeOtherSessions(HttpServletRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long currentSessionId = resolveCurrentSessionId(request);

        if (currentSessionId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Không thể xác định phiên hiện tại để bảo toàn"));
        }

        deviceSessionService.revokeAllOtherSessionsBySessionId(userId, currentSessionId);
        return ResponseEntity.ok(ApiResponse.success("Đã đăng xuất toàn bộ các thiết bị khác"));
    }

    private Long resolveCurrentSessionId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtTokenProvider.getSessionIdFromToken(token);
        }
        return null;
    }
}
