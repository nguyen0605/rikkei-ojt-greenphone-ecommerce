package com.re.greenphone.service;

import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.DeviceSessionResponse;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.UserDeviceSession;
import com.re.greenphone.repository.UserDeviceSessionRepository;
import com.re.greenphone.service.impl.DeviceSessionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceSessionServiceTest {

    @Mock
    private UserDeviceSessionRepository sessionRepository;

    @InjectMocks
    private DeviceSessionServiceImpl sessionService;

    private User user;
    private UserDeviceSession session;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@greenphone.com");

        session = UserDeviceSession.builder()
                .id(100L)
                .user(user)
                .refreshTokenHash("mocked_sha256_hash_123")
                .deviceName("Windows (Chrome)")
                .os("Windows")
                .browser("Chrome")
                .ipAddress("192.168.1.100")
                .isRevoked(false)
                .lastActiveAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
    }

    @Test
    @DisplayName("Băm SHA-256 thành công ra chuỗi hex 64 ký tự")
    void hashToken_Success() {
        String rawToken = "my-secret-refresh-token";
        String hash = sessionService.hashToken(rawToken);

        assertThat(hash).isNotNull();
        assertThat(hash).hasSize(64);
        assertThat(hash).isEqualTo(sessionService.hashToken(rawToken)); // deterministic
    }

    @Test
    @DisplayName("Ghi nhận phiên thiết bị mới thành công từ User-Agent và IP")
    void recordSession_Success() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        request.setRemoteAddr("10.0.0.1");

        when(sessionRepository.save(any(UserDeviceSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        sessionService.recordSession(user, "test-refresh-uuid", 604800000L, request);

        verify(sessionRepository, times(1)).save(argThat(s -> {
            assertThat(s.getUser().getId()).isEqualTo(1L);
            assertThat(s.getOs()).isEqualTo("Windows");
            assertThat(s.getBrowser()).isEqualTo("Chrome");
            assertThat(s.getDeviceName()).isEqualTo("Windows (Chrome)");
            assertThat(s.getIpAddress()).isEqualTo("10.0.0.1");
            assertThat(s.getRefreshTokenHash()).hasSize(64);
            assertThat(s.getIsRevoked()).isFalse();
            return true;
        }));
    }

    @Test
    @DisplayName("Lấy danh sách phiên active và đánh dấu đúng isCurrentSession qua sessionId")
    void getActiveSessionsBySessionId_Success() {
        when(sessionRepository.findActiveSessionsByUserId(eq(1L), any(LocalDateTime.class)))
                .thenReturn(List.of(session));

        List<DeviceSessionResponse> responses = sessionService.getActiveSessionsBySessionId(1L, 100L);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getId()).isEqualTo(100L);
        assertThat(responses.get(0).getIsCurrentSession()).isTrue();
        assertThat(responses.get(0).getDeviceName()).isEqualTo("Windows (Chrome)");
    }

    @Test
    @DisplayName("Lấy danh sách phiên active khi khác sessionId thì isCurrentSession = false")
    void getActiveSessionsBySessionId_OtherSession() {
        when(sessionRepository.findActiveSessionsByUserId(eq(1L), any(LocalDateTime.class)))
                .thenReturn(List.of(session));

        List<DeviceSessionResponse> responses = sessionService.getActiveSessionsBySessionId(1L, 999L);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getIsCurrentSession()).isFalse();
    }

    @Test
    @DisplayName("Thu hồi phiên cụ thể thành công khi đúng chủ sở hữu")
    void revokeSession_Success() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));
        when(sessionRepository.revokeSessionByIdAndUserId(100L, 1L)).thenReturn(1);

        sessionService.revokeSession(1L, 100L);

        verify(sessionRepository).revokeSessionByIdAndUserId(100L, 1L);
    }

    @Test
    @DisplayName("Chống IDOR: Người dùng A không thể thu hồi phiên của Người dùng B")
    void revokeSession_Idor_ThrowsForbidden() {
        User otherUser = new User();
        otherUser.setId(2L);
        session.setUser(otherUser);

        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> sessionService.revokeSession(1L, 100L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Bạn không có quyền thu hồi phiên đăng nhập này");

        verify(sessionRepository, never()).revokeSessionByIdAndUserId(anyLong(), anyLong());
    }

    @Test
    @DisplayName("Thu hồi phiên không tồn tại ném ResourceNotFoundException")
    void revokeSession_NotFound_ThrowsException() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sessionService.revokeSession(1L, 999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Phiên đăng nhập không tồn tại");
    }

    @Test
    @DisplayName("Thu hồi tất cả các phiên khác bằng sessionId thành công")
    void revokeAllOtherSessionsById_Success() {
        when(sessionRepository.revokeAllOtherSessionsById(1L, 100L)).thenReturn(2);

        sessionService.revokeAllOtherSessionsBySessionId(1L, 100L);

        verify(sessionRepository).revokeAllOtherSessionsById(1L, 100L);
    }
}
