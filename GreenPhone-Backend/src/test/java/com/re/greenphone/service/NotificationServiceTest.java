package com.re.greenphone.service;

import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.NotificationResponse;
import com.re.greenphone.entity.Notification;
import com.re.greenphone.entity.User;
import com.re.greenphone.enums.NotificationType;
import com.re.greenphone.repository.NotificationRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private MockedStatic<SecurityUtils> securityUtilsMock;

    private static final Long CURRENT_USER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long NOTIFICATION_ID = 100L;

    private User currentUser;
    private User otherUser;
    private Notification sampleNotification;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(CURRENT_USER_ID);

        currentUser = new User();
        currentUser.setId(CURRENT_USER_ID);
        currentUser.setFullName("Nguyen Van A");
        currentUser.setEmail("user1@example.com");

        otherUser = new User();
        otherUser.setId(OTHER_USER_ID);
        otherUser.setFullName("Tran Van B");
        otherUser.setEmail("user2@example.com");

        sampleNotification = Notification.builder()
                .user(currentUser)
                .title("Đơn hàng #101 đã tạo thành công")
                .content("Cảm ơn bạn đã mua sắm tại GreenPhone.")
                .type(NotificationType.ORDER)
                .isRead(false)
                .readAt(null)
                .redirectUrl("/tai-khoan/don-hang/101")
                .metadataJson("{\"orderId\": 101}")
                .build();
        sampleNotification.setId(NOTIFICATION_ID);
        sampleNotification.setCreatedAt(LocalDateTime.now());
    }

    @AfterEach
    void tearDown() {
        if (securityUtilsMock != null) {
            securityUtilsMock.close();
        }
    }

    @Test
    @DisplayName("getNotifications: Lấy danh sách thông báo phân trang thành công khi isRead = null")
    void getNotifications_WhenIsReadNull_ShouldReturnPageResponse() {
        PageRequest pageRequest = new PageRequest(0, 10, "createdAt", "desc");
        Page<Notification> page = new PageImpl<>(List.of(sampleNotification));

        when(notificationRepository.findNotifications(eq(CURRENT_USER_ID), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = notificationService.getNotifications(null, pageRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("Đơn hàng #101 đã tạo thành công", result.getContent().get(0).getTitle());
        assertEquals(NotificationType.ORDER, result.getContent().get(0).getType());
        assertFalse(result.getContent().get(0).getIsRead());
        verify(notificationRepository, times(1)).findNotifications(eq(CURRENT_USER_ID), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    @DisplayName("getNotifications: Lấy danh sách thông báo với bộ lọc isRead và type")
    void getNotifications_WithFilters_ShouldReturnFilteredPageResponse() {
        PageRequest pageRequest = new PageRequest(0, 10, "createdAt", "desc");
        Page<Notification> page = new PageImpl<>(List.of(sampleNotification));

        when(notificationRepository.findNotifications(eq(CURRENT_USER_ID), eq(false), eq(NotificationType.ORDER), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = notificationService.getNotifications(false, NotificationType.ORDER, pageRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(CURRENT_USER_ID, result.getContent().get(0).getUserId());
    }

    @Test
    @DisplayName("getUnreadCount: Trả về chính xác số lượng thông báo chưa đọc")
    void getUnreadCount_ShouldReturnCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(CURRENT_USER_ID)).thenReturn(5L);

        long count = notificationService.getUnreadCount();

        assertEquals(5L, count);
        verify(notificationRepository, times(1)).countByUserIdAndIsReadFalse(CURRENT_USER_ID);
    }

    @Test
    @DisplayName("markAsRead: Đánh dấu thành công thông báo chưa đọc sang đã đọc")
    void markAsRead_WhenUnread_ShouldMarkAsReadAndSave() {
        when(notificationRepository.findById(NOTIFICATION_ID)).thenReturn(Optional.of(sampleNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = notificationService.markAsRead(NOTIFICATION_ID);

        assertNotNull(response);
        assertTrue(response.getIsRead());
        assertNotNull(response.getReadAt());
        verify(notificationRepository, times(1)).save(sampleNotification);
    }

    @Test
    @DisplayName("markAsRead: Khi thông báo đã đọc từ trước thì không cần save lại")
    void markAsRead_WhenAlreadyRead_ShouldNotSaveAgain() {
        sampleNotification.setIsRead(true);
        sampleNotification.setReadAt(LocalDateTime.now().minusHours(1));

        when(notificationRepository.findById(NOTIFICATION_ID)).thenReturn(Optional.of(sampleNotification));

        NotificationResponse response = notificationService.markAsRead(NOTIFICATION_ID);

        assertNotNull(response);
        assertTrue(response.getIsRead());
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("markAsRead: Ném ResourceNotFoundException nếu ID thông báo không tồn tại")
    void markAsRead_WhenNotFound_ShouldThrowResourceNotFoundException() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead(999L));
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("markAsRead: Ném ForbiddenException khi người dùng cố ý thao tác thông báo của tài khoản khác (chống IDOR)")
    void markAsRead_WhenBelongsToOtherUser_ShouldThrowForbiddenException() {
        sampleNotification.setUser(otherUser);
        when(notificationRepository.findById(NOTIFICATION_ID)).thenReturn(Optional.of(sampleNotification));

        assertThrows(ForbiddenException.class, () -> notificationService.markAsRead(NOTIFICATION_ID));
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("markAllAsRead: Gọi repository đánh dấu tất cả thông báo đã đọc")
    void markAllAsRead_ShouldCallRepository() {
        when(notificationRepository.markAllAsReadByUserId(eq(CURRENT_USER_ID), any(LocalDateTime.class))).thenReturn(3);

        int updated = notificationService.markAllAsRead();

        assertEquals(3, updated);
        verify(notificationRepository, times(1)).markAllAsReadByUserId(eq(CURRENT_USER_ID), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("createNotification: Tạo thông báo mới thành công cho người dùng")
    void createNotification_WhenUserExists_ShouldSaveAndReturnResponse() {
        when(userRepository.findById(CURRENT_USER_ID)).thenReturn(Optional.of(currentUser));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            n.setId(200L);
            n.setCreatedAt(LocalDateTime.now());
            return n;
        });

        NotificationResponse response = notificationService.createNotification(
                CURRENT_USER_ID,
                "Voucher 10% mới",
                "Bạn nhận được voucher giảm giá 10%",
                NotificationType.PROMOTION,
                "/khuyen-mai",
                "{\"voucherCode\":\"SALE10\"}"
        );

        assertNotNull(response);
        assertEquals(200L, response.getId());
        assertEquals("Voucher 10% mới", response.getTitle());
        assertEquals(NotificationType.PROMOTION, response.getType());
        assertFalse(response.getIsRead());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("createNotification: Ném ResourceNotFoundException khi không tìm thấy người dùng")
    void createNotification_WhenUserNotFound_ShouldThrowResourceNotFoundException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.createNotification(
                999L, "Title", "Content", NotificationType.SYSTEM, null, null
        ));
        verify(notificationRepository, never()).save(any(Notification.class));
    }
}
