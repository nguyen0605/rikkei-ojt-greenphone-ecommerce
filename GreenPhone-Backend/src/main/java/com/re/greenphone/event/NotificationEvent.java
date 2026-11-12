package com.re.greenphone.event;

import com.re.greenphone.enums.NotificationType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationEvent {
    private Long userId;
    private String title;
    private String content;
    private NotificationType type;
    private String redirectUrl;
    private String metadataJson;
}

