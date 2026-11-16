package com.re.greenphone.service;

import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.NotificationResponse;
import com.re.greenphone.enums.NotificationType;

public interface NotificationService {

    PageResponse<NotificationResponse> getNotifications(Boolean isRead, PageRequest pageRequest);

    PageResponse<NotificationResponse> getNotifications(Boolean isRead, NotificationType type, PageRequest pageRequest);

    long getUnreadCount();

    NotificationResponse markAsRead(Long id);

    int markAllAsRead();

    NotificationResponse createNotification(Long userId, String title, String content, NotificationType type, String redirectUrl, String metadataJson);
}
