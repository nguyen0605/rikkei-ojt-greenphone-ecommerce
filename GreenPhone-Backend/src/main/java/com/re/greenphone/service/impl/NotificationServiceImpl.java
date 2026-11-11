package com.re.greenphone.service.impl;

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
import com.re.greenphone.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(Boolean isRead, PageRequest pageRequest) {
        return getNotifications(isRead, null, pageRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(Boolean isRead, NotificationType type, PageRequest pageRequest) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        int page = (pageRequest != null && pageRequest.getPage() >= 0) ? pageRequest.getPage() : 0;
        int size = (pageRequest != null && pageRequest.getSize() > 0) ? pageRequest.getSize() : 10;
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);

        Page<Notification> notificationPage = notificationRepository.findNotifications(currentUserId, isRead, type, pageable);

        List<NotificationResponse> responses = notificationPage.getContent().stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());

        return new PageResponse<>(
                responses,
                notificationPage.getNumber(),
                notificationPage.getSize(),
                notificationPage.getTotalElements(),
                notificationPage.getTotalPages(),
                notificationPage.isLast()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return notificationRepository.countByUserIdAndIsReadFalse(currentUserId);
    }

    @Override
    public NotificationResponse markAsRead(Long id) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));

        if (!notification.getUser().getId().equals(currentUserId)) {
            log.warn("IDOR attempt: User {} tried to access notification {} belonging to user {}",
                    currentUserId, id, notification.getUser().getId());
            throw new ForbiddenException("Bạn không có quyền thao tác trên thông báo này");
        }

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationResponse.fromEntity(notification);
    }

    @Override
    public int markAllAsRead() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return notificationRepository.markAllAsReadByUserId(currentUserId, LocalDateTime.now());
    }

    @Override
    public NotificationResponse createNotification(Long userId, String title, String content, NotificationType type, String redirectUrl, String metadataJson) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .content(content)
                .type(type)
                .isRead(false)
                .redirectUrl(redirectUrl)
                .metadataJson(metadataJson)
                .build();

        Notification saved = notificationRepository.save(notification);
        return NotificationResponse.fromEntity(saved);
    }
}

