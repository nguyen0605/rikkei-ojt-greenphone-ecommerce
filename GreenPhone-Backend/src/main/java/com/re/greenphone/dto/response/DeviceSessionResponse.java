package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceSessionResponse {
    private Long id;
    private String deviceName;
    private String os;
    private String browser;
    private String ipAddress;
    private Boolean isCurrentSession;
    private LocalDateTime lastActiveAt;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
