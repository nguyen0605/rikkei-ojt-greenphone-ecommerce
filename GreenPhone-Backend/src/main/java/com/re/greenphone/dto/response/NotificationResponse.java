package com.re.greenphone.dto.response;

import com.re.greenphone.entity.Notification;
import com.re.greenphone.enums.NotificationType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private Long userId;
    private String title;
    private String content;
    private NotificationType type;
    private Boolean isRead;
    private LocalDateTime readAt;
    private String redirectUrl;
    private String metadataJson;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification notification) {
        if (notification == null) {
            return null;
        }
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .title(notification.getTitle())
                .content(notification.getContent())
                .type(notification.getType())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .redirectUrl(notification.getRedirectUrl())
                .metadataJson(notification.getMetadataJson())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

