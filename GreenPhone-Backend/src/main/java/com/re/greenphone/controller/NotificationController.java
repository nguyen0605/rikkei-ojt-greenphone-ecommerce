package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.NotificationResponse;
import com.re.greenphone.enums.NotificationType;
import com.re.greenphone.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/notifications", "/api/notifications"})
@RequiredArgsConstructor
@Tag(name = "Notification", description = "API quản lý thông báo người dùng")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của người dùng đăng nhập có phân trang và bộ lọc")
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getNotifications(
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(required = false) NotificationType type,
            PageRequest pageRequest) {
        PageResponse<NotificationResponse> response = notificationService.getNotifications(isRead, type, pageRequest);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Trả về số lượng thông báo chưa đọc của người dùng đăng nhập")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo đã đọc, kiểm tra quyền sở hữu của người dùng hiện tại")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id) {
        NotificationResponse response = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Đã đánh dấu thông báo là đã đọc"));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Đánh dấu toàn bộ thông báo của người dùng là đã đọc")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success(null, "Đã đánh dấu tất cả thông báo là đã đọc"));
    }
}

