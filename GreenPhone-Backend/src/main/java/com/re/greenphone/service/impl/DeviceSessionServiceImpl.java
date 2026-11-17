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
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceSessionServiceImpl implements DeviceSessionService {

    public static final int MAX_ACTIVE_SESSIONS = 5;
    private final UserDeviceSessionRepository sessionRepository;

    @Override
    @Transactional
    public void recordSession(User user, String rawRefreshToken, long ttlMs, HttpServletRequest request) {
        if (user == null || rawRefreshToken == null || rawRefreshToken.isBlank()) return;

        LocalDateTime now = LocalDateTime.now();

        // Tự động thu hồi phiên cũ nhất nếu đạt giới hạn 5 thiết bị
        List<UserDeviceSession> active = sessionRepository.findActiveSessionsByUserId(user.getId(), now);
        for (int i = active.size() - 1; i >= MAX_ACTIVE_SESSIONS - 1 && i >= 0; i--) {
            active.get(i).setIsRevoked(true);
            sessionRepository.save(active.get(i));
        }

        String userAgent = request != null ? request.getHeader("User-Agent") : null;
        String os = parseOperatingSystem(userAgent);
        String browser = parseBrowser(userAgent);
        String deviceName = os + " (" + browser + ")";

        UserDeviceSession session = UserDeviceSession.builder()
                .user(user)
                .refreshTokenHash(hashToken(rawRefreshToken))
                .deviceName(deviceName.length() > 150 ? deviceName.substring(0, 150) : deviceName)
                .os(os)
                .browser(browser)
                .ipAddress(extractClientIp(request))
                .isRevoked(false)
                .lastActiveAt(now)
                .expiresAt(now.plusSeconds(ttlMs / 1000))
                .build();

        sessionRepository.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceSessionResponse> getActiveSessionsBySessionId(Long userId, Long currentSessionId) {
        if (userId == null) return Collections.emptyList();

        return sessionRepository.findActiveSessionsByUserId(userId, LocalDateTime.now()).stream()
                .map(s -> DeviceSessionResponse.builder()
                        .id(s.getId())
                        .deviceName(s.getDeviceName())
                        .os(s.getOs())
                        .browser(s.getBrowser())
                        .ipAddress(s.getIpAddress())
                        .isCurrentSession(currentSessionId != null && currentSessionId.equals(s.getId()))
                        .lastActiveAt(s.getLastActiveAt())
                        .createdAt(s.getCreatedAt())
                        .expiresAt(s.getExpiresAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        if (userId == null || sessionId == null) {
            throw new ResourceNotFoundException("Phiên đăng nhập không tồn tại");
        }
        UserDeviceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên đăng nhập không tồn tại"));

        if (!session.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền thu hồi phiên đăng nhập này");
        }
        sessionRepository.revokeSessionByIdAndUserId(sessionId, userId);
    }

    @Override
    @Transactional
    public void revokeAllOtherSessionsBySessionId(Long userId, Long currentSessionId) {
        if (userId != null && currentSessionId != null) {
            sessionRepository.revokeAllOtherSessionsById(userId, currentSessionId);
        }
    }

    @Override
    public String hashToken(String rawToken) {
        if (rawToken == null) return "";
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        for (String h : new String[]{"X-Forwarded-For", "Proxy-Client-IP", "WL-Proxy-Client-IP", "HTTP_CLIENT_IP", "X-Real-IP"}) {
            String ip = request.getHeader(h);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip.trim())) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private String parseOperatingSystem(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Unknown OS";
        String ua = userAgent.toLowerCase();
        if (ua.contains("windows")) return "Windows";
        if (ua.contains("iphone") || ua.contains("ipad") || ua.contains("ipod")) return "iOS";
        if (ua.contains("android")) return "Android";
        if (ua.contains("mac os") || ua.contains("macintosh")) return "macOS";
        if (ua.contains("linux")) return "Linux";
        return "Unknown OS";
    }

    private String parseBrowser(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Unknown Browser";
        String ua = userAgent.toLowerCase();
        if (ua.contains("coc_coc") || ua.contains("coccoc")) return "Cốc Cốc";
        if (ua.contains("edg/") || ua.contains("edge/")) return "Edge";
        if (ua.contains("opr/") || ua.contains("opera/")) return "Opera";
        if (ua.contains("chrome") && !ua.contains("chromium") && !ua.contains("edg") && !ua.contains("coccoc")) return "Chrome";
        if (ua.contains("safari") && !ua.contains("chrome")) return "Safari";
        if (ua.contains("firefox")) return "Firefox";
        return "Unknown Browser";
    }
}
