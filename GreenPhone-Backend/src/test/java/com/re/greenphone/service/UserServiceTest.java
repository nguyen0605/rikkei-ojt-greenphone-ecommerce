package com.re.greenphone.service;

import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.UserProfileRequest;
import com.re.greenphone.dto.response.UserDTO;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserProfileRequest profileReq;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("user@example.com");
        testUser.setFullName("Nguyễn Văn A");
        testUser.setPhone("0900000001");
        testUser.setAddress("Hà Nội");

        profileReq = new UserProfileRequest();
        profileReq.setFullName("Nguyễn Văn B");
        profileReq.setPhone("0900000002");
        profileReq.setAddress("Đà Nẵng");
    }

    @Test
    @DisplayName("updateProfile - Thành công khi đổi số điện thoại chưa tồn tại")
    void updateProfile_Success() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.existsByPhone("0900000002")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserDTO userDTO = new UserDTO();
            userDTO.setId(1L);
            userDTO.setPhone("0900000002");
            when(userMapper.toDto(any(User.class))).thenReturn(userDTO);

            UserDTO result = userService.updateProfile(profileReq);

            assertThat(result).isNotNull();
            assertThat(testUser.getPhone()).isEqualTo("0900000002");
            verify(userRepository).save(testUser);
        }
    }

    @Test
    @DisplayName("updateProfile - Thất bại khi số điện thoại trùng với tài khoản khác")
    void updateProfile_PhoneAlreadyInUse_ThrowsConflict() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.existsByPhone("0900000002")).thenReturn(true);

            assertThatThrownBy(() -> userService.updateProfile(profileReq))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("Số điện thoại này đã được sử dụng bởi một tài khoản khác.");

            verify(userRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("updateProfile - Thành công khi giữ nguyên số điện thoại hiện tại của mình")
    void updateProfile_SamePhone_Success() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            profileReq.setPhone("0900000001"); // Giữ nguyên số cũ

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserDTO userDTO = new UserDTO();
            userDTO.setId(1L);
            userDTO.setPhone("0900000001");
            when(userMapper.toDto(any(User.class))).thenReturn(userDTO);

            UserDTO result = userService.updateProfile(profileReq);

            assertThat(result).isNotNull();
            verify(userRepository, never()).existsByPhone(anyString());
            verify(userRepository).save(testUser);
        }
    }

    @Test
    @DisplayName("updateProfile - Chuẩn hóa số điện thoại có tiền tố +84")
    void updateProfile_NormalizePlus84() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            profileReq.setPhone("+84900000002");

            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(userRepository.existsByPhone("0900000002")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserDTO userDTO = new UserDTO();
            userDTO.setId(1L);
            userDTO.setPhone("0900000002");
            when(userMapper.toDto(any(User.class))).thenReturn(userDTO);

            UserDTO result = userService.updateProfile(profileReq);

            assertThat(result).isNotNull();
            assertThat(testUser.getPhone()).isEqualTo("0900000002");
            verify(userRepository).save(testUser);
        }
    }
}
