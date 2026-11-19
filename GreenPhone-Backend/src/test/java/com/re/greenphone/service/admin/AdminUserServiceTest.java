package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.response.UserDTO;
import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.UserDeviceSessionRepository;
import com.re.greenphone.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserDeviceSessionRepository userDeviceSessionRepository;

    @InjectMocks
    private AdminUserService adminUserService;

    private User customerUser;
    private User superAdminUser;
    private Role customerRole;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        customerRole = Role.builder().name("CUSTOMER").description("Khach hang").build();
        customerRole.setId(1L);

        adminRole = Role.builder().name("ADMIN").description("Quan tri vien").build();
        adminRole.setId(2L);

        customerUser = new User();
        customerUser.setId(10L);
        customerUser.setEmail("customer@example.com");
        customerUser.setFullName("Nguyen Van Khach");
        customerUser.setStatus("ACTIVE");
        customerUser.setRole(customerRole);

        superAdminUser = new User();
        superAdminUser.setId(1L);
        superAdminUser.setEmail("admin@greenphone.vn");
        superAdminUser.setFullName("Super Admin");
        superAdminUser.setStatus("ACTIVE");
        superAdminUser.setRole(adminRole);
    }

    @Test
    @DisplayName("Admin khóa khách hàng: chuyển status sang BLOCKED và thu hồi toàn bộ session đăng nhập")
    void updateUserStatus_BlockCustomer_RevokesAllSessions() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDTO mockDto = new UserDTO();
        mockDto.setId(10L);
        mockDto.setStatus("BLOCKED");
        when(userMapper.toDto(any(User.class))).thenReturn(mockDto);

        UserDTO result = adminUserService.updateUserStatus(10L, "BLOCKED", "admin@greenphone.vn");

        assertThat(result.getStatus()).isEqualTo("BLOCKED");
        assertThat(customerUser.getStatus()).isEqualTo("BLOCKED");
        verify(userDeviceSessionRepository).revokeAllSessionsByUserId(10L);
        verify(userRepository).save(customerUser);
    }

    @Test
    @DisplayName("Chuẩn hóa trạng thái LOCKED thành BLOCKED và thu hồi session")
    void updateUserStatus_StandardizeLockedToBlocked() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDTO mockDto = new UserDTO();
        mockDto.setId(10L);
        mockDto.setStatus("BLOCKED");
        when(userMapper.toDto(any(User.class))).thenReturn(mockDto);

        UserDTO result = adminUserService.updateUserStatus(10L, "LOCKED", "admin@greenphone.vn");

        assertThat(result.getStatus()).isEqualTo("BLOCKED");
        assertThat(customerUser.getStatus()).isEqualTo("BLOCKED");
        verify(userDeviceSessionRepository).revokeAllSessionsByUserId(10L);
    }

    @Test
    @DisplayName("Admin mở khóa khách hàng: chuyển status sang ACTIVE, không thu hồi session")
    void updateUserStatus_ActivateCustomer_DoesNotRevokeSessions() {
        customerUser.setStatus("BLOCKED");
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDTO mockDto = new UserDTO();
        mockDto.setId(10L);
        mockDto.setStatus("ACTIVE");
        when(userMapper.toDto(any(User.class))).thenReturn(mockDto);

        UserDTO result = adminUserService.updateUserStatus(10L, "ACTIVE", "admin@greenphone.vn");

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(customerUser.getStatus()).isEqualTo("ACTIVE");
        verify(userDeviceSessionRepository, never()).revokeAllSessionsByUserId(anyLong());
    }

    @Test
    @DisplayName("Tự khóa tài khoản chính mình: ném ngoại lệ BadRequestException")
    void updateUserStatus_SelfLock_ThrowsBadRequest() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(customerUser));

        assertThatThrownBy(() -> adminUserService.updateUserStatus(10L, "BLOCKED", "customer@example.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");

        verify(userDeviceSessionRepository, never()).revokeAllSessionsByUserId(anyLong());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Khóa tài khoản Quản trị viên tối cao: ném ngoại lệ BadRequestException")
    void updateUserStatus_SuperAdminLock_ThrowsBadRequest() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdminUser));

        assertThatThrownBy(() -> adminUserService.updateUserStatus(1L, "BLOCKED", "sales@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản Quản trị viên tối cao là bất khả xâm phạm");

        verify(userDeviceSessionRepository, never()).revokeAllSessionsByUserId(anyLong());
        verify(userRepository, never()).save(any(User.class));
    }
}
