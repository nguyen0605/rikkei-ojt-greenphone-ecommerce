package com.re.greenphone.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TokenRedisServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TokenRedisService tokenRedisService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Lưu Refresh Token hợp lệ vào Whitelist trên Redis")
    void saveRefreshToken_Success() {
        tokenRedisService.saveRefreshToken(10L, "sample-refresh-token", 604800L);

        verify(valueOperations).set(
                eq("whitelist:refresh:10"),
                eq("sample-refresh-token"),
                eq(604800L),
                eq(TimeUnit.SECONDS)
        );
    }

    @Test
    @DisplayName("Kiểm tra Refresh Token hợp lệ khớp với Whitelist")
    void isValidRefreshToken_Valid() {
        when(valueOperations.get("whitelist:refresh:10")).thenReturn("sample-refresh-token");

        boolean valid = tokenRedisService.isValidRefreshToken(10L, "sample-refresh-token");

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("Kiểm tra Refresh Token không khớp hoặc đã bị thu hồi trả về false")
    void isValidRefreshToken_InvalidOrRevoked() {
        when(valueOperations.get("whitelist:refresh:10")).thenReturn("different-token");

        boolean valid = tokenRedisService.isValidRefreshToken(10L, "sample-refresh-token");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("Xóa Refresh Token khỏi Whitelist khi Logout")
    void deleteRefreshToken_Success() {
        tokenRedisService.deleteRefreshToken(10L);

        verify(redisTemplate).delete("whitelist:refresh:10");
    }

    @Test
    @DisplayName("Đưa Access Token vào Blacklist theo JTI khi Logout")
    void blacklistAccessToken_Success() {
        tokenRedisService.blacklistAccessToken("jti-uuid-1234", 900L);

        verify(valueOperations).set(
                eq("blacklist:access:jti-uuid-1234"),
                eq("revoked"),
                eq(900L),
                eq(TimeUnit.SECONDS)
        );
    }

    @Test
    @DisplayName("Kiểm tra Access Token đã bị thu hồi (Blacklist)")
    void isAccessTokenBlacklisted_ReturnsTrueWhenPresent() {
        when(redisTemplate.hasKey("blacklist:access:jti-uuid-1234")).thenReturn(true);

        boolean blacklisted = tokenRedisService.isAccessTokenBlacklisted("jti-uuid-1234", null);

        assertThat(blacklisted).isTrue();
    }
}
