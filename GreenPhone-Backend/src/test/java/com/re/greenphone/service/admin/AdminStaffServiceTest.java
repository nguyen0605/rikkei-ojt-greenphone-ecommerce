package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.CreateStaffRequest;
import com.re.greenphone.dto.request.UpdateStaffRoleRequest;
import com.re.greenphone.dto.response.StaffDTO;
import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.repository.RoleRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.service.admin.impl.AdminStaffServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminStaffServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    RoleRepository roleRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @InjectMocks
    AdminStaffServiceImpl service;

    Role roleSales;
    Role roleWarehouse;
    Role roleAdmin;
    User staffSales;

    @BeforeEach
    void setUp() {
        roleSales = Role.builder().name("SALES").description("Nhan vien kinh doanh").build();
        roleWarehouse = Role.builder().name("WAREHOUSE").description("Nhan vien kho").build();
        roleAdmin = Role.builder().name("ADMIN").description("Quan tri vien").build();

        staffSales = new User();
        staffSales.setId(10L);
        staffSales.setFullName("Nguyen Van Sales");
        staffSales.setEmail("sales@greenphone.vn");
        staffSales.setPhone("0901234567");
        staffSales.setPassword("encoded_pass");
        staffSales.setRole(roleSales);
        staffSales.setStatus("ACTIVE");
    }

    @Test
    @DisplayName("Lấy danh sách nhân viên thành công với phân trang")
    void getStaffList_Success() {
        Page<User> page = new PageImpl<>(List.of(staffSales));
        when(userRepository.searchStaff(any(), any(), any(), any(Pageable.class))).thenReturn(page);

        PageRequest pageRequest = new PageRequest();
        pageRequest.setPage(0);
        pageRequest.setSize(10);

        PageResponse<StaffDTO> result = service.getStaffList("sales", "ROLE_SALES", pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmail()).isEqualTo("sales@greenphone.vn");
        assertThat(result.getContent().get(0).getRole()).isEqualTo("ROLE_SALES");
    }

    @Test
    @DisplayName("Tạo nhân viên mới thành công")
    void createStaff_Success() {
        CreateStaffRequest request = CreateStaffRequest.builder()
                .fullName("Nguyen Van Kho")
                .email("kho@greenphone.vn")
                .phone("0987654321")
                .password("password123")
                .role("ROLE_WAREHOUSE")
                .build();

        when(userRepository.existsByEmail("kho@greenphone.vn")).thenReturn(false);
        when(userRepository.existsByPhone("0987654321")).thenReturn(false);
        when(roleRepository.findByName("WAREHOUSE")).thenReturn(Optional.of(roleWarehouse));
        when(passwordEncoder.encode("password123")).thenReturn("hashed_secret");

        User savedUser = new User();
        savedUser.setId(11L);
        savedUser.setFullName(request.getFullName());
        savedUser.setEmail(request.getEmail());
        savedUser.setPhone(request.getPhone());
        savedUser.setPassword("hashed_secret");
        savedUser.setRole(roleWarehouse);
        savedUser.setStatus("ACTIVE");

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        StaffDTO dto = service.createStaff(request);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(11L);
        assertThat(dto.getRole()).isEqualTo("ROLE_WAREHOUSE");
        assertThat(dto.getEmail()).isEqualTo("kho@greenphone.vn");
    }

    @Test
    @DisplayName("Tạo nhân viên ném BadRequestException khi email đã tồn tại")
    void createStaff_EmailExists_ThrowsBadRequest() {
        CreateStaffRequest request = CreateStaffRequest.builder()
                .fullName("Nguyen Van Kho")
                .email("sales@greenphone.vn")
                .phone("0987654321")
                .password("password123")
                .role("WAREHOUSE")
                .build();

        when(userRepository.existsByEmail("sales@greenphone.vn")).thenReturn(true);

        assertThatThrownBy(() -> service.createStaff(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email đã tồn tại");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạo nhân viên ném BadRequestException khi số điện thoại đã tồn tại")
    void createStaff_PhoneExists_ThrowsBadRequest() {
        CreateStaffRequest request = CreateStaffRequest.builder()
                .fullName("Nguyen Van Kho")
                .email("kho@greenphone.vn")
                .phone("0901234567")
                .password("password123")
                .role("WAREHOUSE")
                .build();

        when(userRepository.existsByEmail("kho@greenphone.vn")).thenReturn(false);
        when(userRepository.existsByPhone("0901234567")).thenReturn(true);

        assertThatThrownBy(() -> service.createStaff(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Số điện thoại đã được đăng ký");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật vai trò nhân viên thành công")
    void updateStaffRole_Success() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(staffSales));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(roleAdmin));
        when(userRepository.save(any(User.class))).thenReturn(staffSales);

        UpdateStaffRoleRequest request = new UpdateStaffRoleRequest("ROLE_ADMIN");
        StaffDTO dto = service.updateStaffRole(10L, request, "admin@greenphone.vn");

        assertThat(dto).isNotNull();
        verify(userRepository).save(staffSales);
    }

    @Test
    @DisplayName("Ngăn chặn tự thay đổi vai trò của chính mình")
    void updateStaffRole_SelfModification_ThrowsBadRequest() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(staffSales));

        UpdateStaffRoleRequest request = new UpdateStaffRoleRequest("ROLE_ADMIN");
        assertThatThrownBy(() -> service.updateStaffRole(10L, request, "sales@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể tự thay đổi vai trò của chính mình");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ngăn chặn tự khóa tài khoản của chính mình")
    void updateStaffStatus_SelfLock_ThrowsBadRequest() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(staffSales));

        assertThatThrownBy(() -> service.updateStaffStatus(10L, "BLOCKED", "sales@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");

        verify(userRepository, never()).save(any());
    }
}
