package com.re.greenphone.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenRedisService {

    private final StringRedisTemplate redisTemplate;

    public static final String REFRESH_WHITELIST_PREFIX = "whitelist:refresh:";
    public static final String ACCESS_BLACKLIST_PREFIX = "blacklist:access:";
    public static final String TOKEN_BLACKLIST_PREFIX = "blacklist:";

    // 1. Lưu Refresh Token hợp lệ vào Whitelist trên Redis (7 ngày = 604800 giây)
    public void saveRefreshToken(Long userId, String refreshToken, long durationInSeconds) {
        if (userId == null || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            String key = REFRESH_WHITELIST_PREFIX + userId;
            long ttl = durationInSeconds > 0 ? durationInSeconds : 604800L;
            redisTemplate.opsForValue().set(key, refreshToken.trim(), ttl, TimeUnit.SECONDS);
            log.debug("Đã lưu Refresh Token whitelist cho userId={} trên Redis", userId);
        } catch (Exception ex) {
            log.warn("Lỗi khi lưu Refresh Token vào Redis whitelist: {}", ex.getMessage());
        }
    }

    // Kiểm tra Refresh Token có hợp lệ và khớp với Whitelist trên Redis không
    public boolean isValidRefreshToken(Long userId, String refreshToken) {
        if (userId == null || refreshToken == null || refreshToken.isBlank()) {
            return false;
        }
        try {
            String key = REFRESH_WHITELIST_PREFIX + userId;
            String storedToken = redisTemplate.opsForValue().get(key);
            if (storedToken == null) {
                return false;
            }
            return refreshToken.trim().equals(storedToken.trim());
        } catch (Exception ex) {
            log.warn("Lỗi khi kiểm tra Redis whitelist, cho phép fallback DB: {}", ex.getMessage());
            return true;
        }
    }

    // Xóa Refresh Token khỏi Whitelist khi Logout hoặc bị thu hồi
    public void deleteRefreshToken(Long userId) {
        if (userId == null) {
            return;
        }
        try {
            String key = REFRESH_WHITELIST_PREFIX + userId;
            redisTemplate.delete(key);
            log.debug("Đã xóa Refresh Token whitelist cho userId={}", userId);
        } catch (Exception ex) {
            log.warn("Lỗi khi xóa Refresh Token khỏi Redis whitelist: {}", ex.getMessage());
        }
    }

    // 2. Đưa Access Token vào Blacklist khi Logout (theo JTI hoặc toàn bộ token)
    public void blacklistAccessToken(String jti, long remainingSeconds) {
        if (jti == null || jti.isBlank() || remainingSeconds <= 0) {
            return;
        }
        try {
            String key = ACCESS_BLACKLIST_PREFIX + jti.trim();
            redisTemplate.opsForValue().set(key, "revoked", remainingSeconds, TimeUnit.SECONDS);
            log.debug("Đã đưa JTI={} vào Blacklist trên Redis với TTL={} giây", jti, remainingSeconds);
        } catch (Exception ex) {
            log.warn("Lỗi khi đưa JTI vào Blacklist trên Redis: {}", ex.getMessage());
        }
    }

    public void blacklistRawToken(String token, long remainingSeconds) {
        if (token == null || token.isBlank() || remainingSeconds <= 0) {
            return;
        }
        try {
            String key = TOKEN_BLACKLIST_PREFIX + token.trim();
            redisTemplate.opsForValue().set(key, "revoked", remainingSeconds, TimeUnit.SECONDS);
            log.debug("Đã đưa raw token vào Blacklist trên Redis với TTL={} giây", remainingSeconds);
        } catch (Exception ex) {
            log.warn("Lỗi khi đưa raw token vào Blacklist trên Redis: {}", ex.getMessage());
        }
    }

    // Kiểm tra Access Token có nằm trong Blacklist không
    public boolean isAccessTokenBlacklisted(String jti, String rawToken) {
        try {
            if (jti != null && !jti.isBlank()) {
                Boolean isJtiBlacklisted = redisTemplate.hasKey(ACCESS_BLACKLIST_PREFIX + jti.trim());
                if (Boolean.TRUE.equals(isJtiBlacklisted)) {
                    return true;
                }
            }
            if (rawToken != null && !rawToken.isBlank()) {
                Boolean isRawBlacklisted = redisTemplate.hasKey(TOKEN_BLACKLIST_PREFIX + rawToken.trim());
                if (Boolean.TRUE.equals(isRawBlacklisted)) {
                    return true;
                }
            }
        } catch (Exception ex) {
            log.warn("Lỗi khi kiểm tra Blacklist trên Redis: {}", ex.getMessage());
        }
        return false;
    }
}
