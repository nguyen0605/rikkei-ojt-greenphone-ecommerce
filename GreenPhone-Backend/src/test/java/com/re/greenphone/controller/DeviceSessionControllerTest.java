package com.re.greenphone.controller;

import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.DeviceSessionResponse;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.DeviceSessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DeviceSessionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DeviceSessionService deviceSessionService;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private DeviceSessionController deviceSessionController;

    private MockedStatic<SecurityUtils> mockedSecurityUtils;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(deviceSessionController)
                .build();
        mockedSecurityUtils = mockStatic(SecurityUtils.class);
        mockedSecurityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        mockedSecurityUtils.close();
    }

    @Test
    @DisplayName("GET /api/v1/account/devices: Lấy danh sách thiết bị thành công")
    void getActiveDevices_Success() throws Exception {
        DeviceSessionResponse device = DeviceSessionResponse.builder()
                .id(10L)
                .deviceName("Windows (Chrome)")
                .os("Windows")
                .browser("Chrome")
                .ipAddress("127.0.0.1")
                .isCurrentSession(true)
                .lastActiveAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        when(deviceSessionService.getActiveSessionsBySessionId(eq(1L), any())).thenReturn(List.of(device));

        mockMvc.perform(get("/api/v1/account/devices")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].deviceName").value("Windows (Chrome)"))
                .andExpect(jsonPath("$.data[0].isCurrentSession").value(true));
    }

    @Test
    @DisplayName("DELETE /api/v1/account/devices/{sessionId}: Thu hồi phiên thành công")
    void revokeSession_Success() throws Exception {
        doNothing().when(deviceSessionService).revokeSession(1L, 10L);

        mockMvc.perform(delete("/api/v1/account/devices/10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value("Phiên đăng nhập đã được thu hồi thành công"));

        verify(deviceSessionService).revokeSession(1L, 10L);
    }

    @Test
    @DisplayName("POST /api/v1/account/devices/revoke-others với Bearer token có sessionId: Bảo toàn phiên gọi")
    void revokeOthers_WithBearerSessionId_Success() throws Exception {
        when(jwtTokenProvider.getSessionIdFromToken("sample-jwt")).thenReturn(55L);
        doNothing().when(deviceSessionService).revokeAllOtherSessionsBySessionId(1L, 55L);

        mockMvc.perform(post("/api/v1/account/devices/revoke-others")
                        .header("Authorization", "Bearer sample-jwt")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value("Đã đăng xuất toàn bộ các thiết bị khác"));

        verify(deviceSessionService).revokeAllOtherSessionsBySessionId(1L, 55L);
    }

    @Test
    @DisplayName("POST /api/v1/account/devices/revoke-others khi thiếu sessionId từ chối an toàn 400")
    void revokeOthers_WithoutSessionId_ReturnsBadRequest() throws Exception {
        when(jwtTokenProvider.getSessionIdFromToken("sample-jwt")).thenReturn(null);

        mockMvc.perform(post("/api/v1/account/devices/revoke-others")
                        .header("Authorization", "Bearer sample-jwt")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("Không thể xác định phiên hiện tại để bảo toàn"));

        verify(deviceSessionService, never()).revokeAllOtherSessionsBySessionId(anyLong(), anyLong());
    }
}
