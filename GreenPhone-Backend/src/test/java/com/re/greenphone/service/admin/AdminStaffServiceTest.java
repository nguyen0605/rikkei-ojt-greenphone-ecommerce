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

        StaffDTO dto = service.createStaff(request, "admin@greenphone.vn");

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

        assertThatThrownBy(() -> service.createStaff(request, "admin@greenphone.vn"))
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

        assertThatThrownBy(() -> service.createStaff(request, "admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Số điện thoại đã được đăng ký");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin thường không thể tạo tài khoản có vai trò ADMIN")
    void createStaff_RegularAdminCannotCreateAdmin() {
        CreateStaffRequest request = CreateStaffRequest.builder()
                .fullName("New Sub Admin")
                .email("subadmin@greenphone.vn")
                .phone("0909999999")
                .password("password123")
                .role("ROLE_ADMIN")
                .build();

        when(userRepository.existsByEmail("subadmin@greenphone.vn")).thenReturn(false);
        when(userRepository.existsByPhone("0909999999")).thenReturn(false);

        User normalAdmin = new User();
        normalAdmin.setId(99L);
        normalAdmin.setEmail("normal.admin@greenphone.vn");
        normalAdmin.setRole(roleAdmin);
        when(userRepository.findByEmail("normal.admin@greenphone.vn")).thenReturn(Optional.of(normalAdmin));

        assertThatThrownBy(() -> service.createStaff(request, "normal.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ Quản trị viên tối cao mới có quyền tạo tài khoản Quản trị viên mới");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật vai trò nhân viên thành công bởi Super Admin")
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
    @DisplayName("Ngăn chặn thay đổi vai trò của Quản trị viên tối cao")
    void updateStaffRole_SuperAdminCannotBeDemoted() {
        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setEmail("admin@greenphone.vn");
        superAdmin.setRole(roleAdmin);

        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        UpdateStaffRoleRequest request = new UpdateStaffRoleRequest("ROLE_SALES");
        assertThatThrownBy(() -> service.updateStaffRole(1L, request, "other.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể thay đổi vai trò");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin thường không thể điều chỉnh vai trò của Admin khác")
    void updateStaffRole_RegularAdminCannotDemoteAnotherAdmin() {
        User adminTarget = new User();
        adminTarget.setId(20L);
        adminTarget.setEmail("second.admin@greenphone.vn");
        adminTarget.setRole(roleAdmin);

        User normalAdmin = new User();
        normalAdmin.setId(99L);
        normalAdmin.setEmail("normal.admin@greenphone.vn");
        normalAdmin.setRole(roleAdmin);

        when(userRepository.findById(20L)).thenReturn(Optional.of(adminTarget));
        when(userRepository.findByEmail("normal.admin@greenphone.vn")).thenReturn(Optional.of(normalAdmin));

        UpdateStaffRoleRequest request = new UpdateStaffRoleRequest("ROLE_WAREHOUSE");
        assertThatThrownBy(() -> service.updateStaffRole(20L, request, "normal.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ Quản trị viên tối cao mới có quyền điều chỉnh vai trò của Quản trị viên khác");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin thường không thể nâng quyền người khác lên ADMIN")
    void updateStaffRole_RegularAdminCannotPromoteToAdmin() {
        User normalAdmin = new User();
        normalAdmin.setId(99L);
        normalAdmin.setEmail("normal.admin@greenphone.vn");
        normalAdmin.setRole(roleAdmin);

        when(userRepository.findById(10L)).thenReturn(Optional.of(staffSales));
        when(userRepository.findByEmail("normal.admin@greenphone.vn")).thenReturn(Optional.of(normalAdmin));

        UpdateStaffRoleRequest request = new UpdateStaffRoleRequest("ROLE_ADMIN");
        assertThatThrownBy(() -> service.updateStaffRole(10L, request, "normal.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ Quản trị viên tối cao mới có quyền nâng cấp tài khoản lên Quản trị viên");

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

    @Test
    @DisplayName("Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể bị khóa bởi bất kỳ ai")
    void updateStaffStatus_SuperAdminCannotBeLocked() {
        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setEmail("admin@greenphone.vn");
        superAdmin.setRole(roleAdmin);

        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        // Tài khoản admin khác cố tình gọi khóa super admin
        assertThatThrownBy(() -> service.updateStaffStatus(1L, "BLOCKED", "other.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể bị khóa");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin thường không thể khóa hoặc mở khóa tài khoản của Admin khác")
    void updateStaffStatus_RegularAdminCannotBlockAnotherAdmin() {
        User targetAdmin = new User();
        targetAdmin.setId(22L);
        targetAdmin.setEmail("target.admin@greenphone.vn");
        targetAdmin.setRole(roleAdmin);

        User normalAdmin = new User();
        normalAdmin.setId(99L);
        normalAdmin.setEmail("normal.admin@greenphone.vn");
        normalAdmin.setRole(roleAdmin);

        when(userRepository.findById(22L)).thenReturn(Optional.of(targetAdmin));
        when(userRepository.findByEmail("normal.admin@greenphone.vn")).thenReturn(Optional.of(normalAdmin));

        assertThatThrownBy(() -> service.updateStaffStatus(22L, "BLOCKED", "normal.admin@greenphone.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ Quản trị viên tối cao mới có quyền khóa hoặc mở khóa tài khoản Quản trị viên khác");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Super Admin có quyền khóa tài khoản của Admin cấp dưới vi phạm")
    void updateStaffStatus_SuperAdminCanBlockSubAdmin() {
        User targetAdmin = new User();
        targetAdmin.setId(22L);
        targetAdmin.setEmail("target.admin@greenphone.vn");
        targetAdmin.setRole(roleAdmin);
        targetAdmin.setStatus("ACTIVE");

        when(userRepository.findById(22L)).thenReturn(Optional.of(targetAdmin));
        when(userRepository.save(any(User.class))).thenReturn(targetAdmin);

        StaffDTO dto = service.updateStaffStatus(22L, "BLOCKED", "admin@greenphone.vn");

        assertThat(dto).isNotNull();
        assertThat(targetAdmin.getStatus()).isEqualTo("BLOCKED");
        verify(userRepository).save(targetAdmin);
    }
}
