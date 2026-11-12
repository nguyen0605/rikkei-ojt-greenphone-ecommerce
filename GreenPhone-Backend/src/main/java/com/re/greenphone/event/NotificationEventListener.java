package com.re.greenphone.event;

import com.re.greenphone.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    @Async
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        if (event == null || event.getUserId() == null) {
            log.warn("Bỏ qua NotificationEvent không hợp lệ hoặc thiếu userId: {}", event);
            return;
        }

        try {
            log.debug("Đang xử lý tạo thông báo bất đồng bộ cho user ID {}: {}", event.getUserId(), event.getTitle());
            notificationService.createNotification(
                    event.getUserId(),
                    event.getTitle(),
                    event.getContent(),
                    event.getType(),
                    event.getRedirectUrl(),
                    event.getMetadataJson()
            );
            log.info("Đã tạo thành công thông báo in-app cho user ID {} với tiêu đề: '{}'",
                    event.getUserId(), event.getTitle());
        } catch (Exception e) {
            // Độc lập hoàn toàn, không làm gián đoạn hoặc rollback giao dịch chính
            log.error("Lỗi khi tạo thông báo in-app cho user ID {} với tiêu đề '{}'. Nguyên nhân: {}",
                    event.getUserId(), event.getTitle(), e.getMessage(), e);
        }
    }
}
