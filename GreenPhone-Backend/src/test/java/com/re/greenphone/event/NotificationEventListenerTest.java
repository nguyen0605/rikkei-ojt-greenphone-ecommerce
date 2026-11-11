package com.re.greenphone.event;

import com.re.greenphone.enums.NotificationType;
import com.re.greenphone.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationEventListener listener;

    @Test
    @DisplayName("handleNotificationEvent: Tiếp nhận sự kiện và lưu thông báo thành công qua NotificationService")
    void handleNotificationEvent_Success() {
        NotificationEvent event = NotificationEvent.builder()
                .userId(1L)
                .title("Đơn hàng #100 đã tạo thành công")
                .content("Đơn hàng đang chờ xử lý")
                .type(NotificationType.ORDER)
                .redirectUrl("/tai-khoan/don-hang/100")
                .metadataJson("{\"orderId\": 100}")
                .build();

        listener.handleNotificationEvent(event);

        verify(notificationService, times(1)).createNotification(
                eq(1L),
                eq("Đơn hàng #100 đã tạo thành công"),
                eq("Đơn hàng đang chờ xử lý"),
                eq(NotificationType.ORDER),
                eq("/tai-khoan/don-hang/100"),
                eq("{\"orderId\": 100}")
        );
    }

    @Test
    @DisplayName("handleNotificationEvent: Bỏ qua khi event là null hoặc userId là null")
    void handleNotificationEvent_WhenEventOrUserIdNull_ShouldIgnore() {
        listener.handleNotificationEvent(null);
        listener.handleNotificationEvent(NotificationEvent.builder().userId(null).title("Test").build());

        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("handleNotificationEvent: Độc lập bắt ngoại lệ, không bao giờ ném lỗi ra ngoài làm rollback giao dịch chính")
    void handleNotificationEvent_WhenServiceThrows_ShouldCatchAndNotRethrow() {
        NotificationEvent event = NotificationEvent.builder()
                .userId(1L)
                .title("Đơn hàng #100")
                .content("Nội dung")
                .type(NotificationType.ORDER)
                .build();

        doThrow(new RuntimeException("Database error simulation"))
                .when(notificationService)
                .createNotification(any(), any(), any(), any(), any(), any());

        assertDoesNotThrow(() -> listener.handleNotificationEvent(event));
        verify(notificationService, times(1)).createNotification(any(), any(), any(), any(), any(), any());
    }
}

