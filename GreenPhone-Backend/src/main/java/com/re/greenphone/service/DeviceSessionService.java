package com.re.greenphone.service;

import com.re.greenphone.dto.response.DeviceSessionResponse;
import com.re.greenphone.entity.User;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface DeviceSessionService {

    void recordSession(User user, String rawRefreshToken, long ttlMs, HttpServletRequest request);

    List<DeviceSessionResponse> getActiveSessionsBySessionId(Long userId, Long currentSessionId);

    void revokeSession(Long userId, Long sessionId);

    void revokeAllOtherSessionsBySessionId(Long userId, Long currentSessionId);

    String hashToken(String rawToken);
}
