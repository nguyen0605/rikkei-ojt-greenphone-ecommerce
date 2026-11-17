package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.DeviceSessionResponse;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.UserDeviceSession;
import com.re.greenphone.repository.UserDeviceSessionRepository;
import com.re.greenphone.service.DeviceSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceSessionServiceImpl implements DeviceSessionService {

    private final UserDeviceSessionRepository sessionRepository;

    @Override
    @Transactional
    public void recordSession(User user, String rawRefreshToken, long ttlMs, HttpServletRequest request) {
        if (user == null || rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawRefreshToken);
        String userAgent = request != null ? request.getHeader("User-Agent") : null;
        String clientIp = extractClientIp(request);

        String os = parseOperatingSystem(userAgent);
        String browser = parseBrowser(userAgent);
        String deviceName = buildDeviceName(os, browser);
        if (deviceName.length() > 150) {
            deviceName = deviceName.substring(0, 150);
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusSeconds(ttlMs / 1000);

        UserDeviceSession session = UserDeviceSession.builder()
                .user(user)
                .refreshTokenHash(tokenHash)
                .deviceName(deviceName)
                .os(os)
                .browser(browser)
                .ipAddress(clientIp)
                .isRevoked(false)
                .lastActiveAt(now)
                .expiresAt(expiresAt)
                .build();

        sessionRepository.save(session);
        log.info("Recorded new device session for user id={}, device={}, ip={}", user.getId(), deviceName, clientIp);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceSessionResponse> getActiveSessionsBySessionId(Long userId, Long currentSessionId) {
        if (userId == null) {
            return Collections.emptyList();
        }

        List<UserDeviceSession> sessions = sessionRepository.findActiveSessionsByUserId(userId, LocalDateTime.now());

        return sessions.stream().map(s -> DeviceSessionResponse.builder()
                .id(s.getId())
                .deviceName(s.getDeviceName())
                .os(s.getOs())
                .browser(s.getBrowser())
                .ipAddress(s.getIpAddress())
                .isCurrentSession(currentSessionId != null && currentSessionId.equals(s.getId()))
                .lastActiveAt(s.getLastActiveAt())
                .createdAt(s.getCreatedAt())
                .expiresAt(s.getExpiresAt())
                .build()).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        if (userId == null || sessionId == null) {
            throw new ResourceNotFoundException("Phiên đăng nhập không tồn tại");
        }

        UserDeviceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên đăng nhập không tồn tại"));

        // Anti-IDOR check: verify ownership
        if (!session.getUser().getId().equals(userId)) {
            log.warn("IDOR attempt: User {} tried to revoke session {} owned by user {}",
                    userId, sessionId, session.getUser().getId());
            throw new ForbiddenException("Bạn không có quyền thu hồi phiên đăng nhập này");
        }

        sessionRepository.revokeSessionByIdAndUserId(sessionId, userId);
        log.info("Session id={} revoked successfully by user id={}", sessionId, userId);
    }

    @Override
    @Transactional
    public void revokeAllOtherSessionsBySessionId(Long userId, Long currentSessionId) {
        if (userId == null || currentSessionId == null) {
            return;
        }
        int count = sessionRepository.revokeAllOtherSessionsById(userId, currentSessionId);
        log.info("Revoked {} other sessions by sessionId for user id={}", count, userId);
    }

    @Override
    public String hashToken(String rawToken) {
        if (rawToken == null) {
            return "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String[] headers = {
                "X-Forwarded-For",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_CLIENT_IP",
                "HTTP_X_FORWARDED_FOR",
                "X-Real-IP"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip.trim())) {
                if (ip.contains(",")) {
                    return ip.split(",")[0].trim();
                }
                return ip.trim();
            }
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private String parseOperatingSystem(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown OS";
        }
        String ua = userAgent.toLowerCase();
        if (ua.contains("windows nt 10.0") || ua.contains("windows 11") || ua.contains("windows nt 11.0")) {
            return "Windows";
        } else if (ua.contains("windows")) {
            return "Windows";
        } else if (ua.contains("iphone") || ua.contains("ipad") || ua.contains("ipod")) {
            return "iOS";
        } else if (ua.contains("android")) {
            return "Android";
        } else if (ua.contains("mac os") || ua.contains("macintosh")) {
            return "macOS";
        } else if (ua.contains("linux")) {
            return "Linux";
        }
        return "Unknown OS";
    }

    private String parseBrowser(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown Browser";
        }
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg/") || ua.contains("edge/")) {
            return "Edge";
        } else if (ua.contains("opr/") || ua.contains("opera/")) {
            return "Opera";
        } else if (ua.contains("chrome") && !ua.contains("chromium") && !ua.contains("edg")) {
            return "Chrome";
        } else if (ua.contains("safari") && !ua.contains("chrome")) {
            return "Safari";
        } else if (ua.contains("firefox")) {
            return "Firefox";
        }
        return "Unknown Browser";
    }

    private String buildDeviceName(String os, String browser) {
        return os + " (" + browser + ")";
    }
}
