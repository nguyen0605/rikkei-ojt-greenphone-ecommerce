package com.re.greenphone.service.admin.impl;

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
import com.re.greenphone.service.AuthService;
import com.re.greenphone.service.admin.AdminStaffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminStaffServiceImpl implements AdminStaffService {

    public static final String SUPER_ADMIN_EMAIL = "admin@greenphone.vn";
    public static final Long SUPER_ADMIN_ID = 1L;

    private static final List<String> STAFF_ROLES = List.of("ADMIN", "SALES", "WAREHOUSE", "MARKETING");
    private static final List<String> VALID_STATUSES = List.of("ACTIVE", "INACTIVE", "BLOCKED");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.re.greenphone.repository.UserDeviceSessionRepository userDeviceSessionRepository;

    private boolean isSuperAdmin(String username, User user) {
        if (username != null && SUPER_ADMIN_EMAIL.equalsIgnoreCase(username.trim())) {
            return true;
        }
        if (user != null) {
            return (user.getId() != null && SUPER_ADMIN_ID.equals(user.getId()))
                    || SUPER_ADMIN_EMAIL.equalsIgnoreCase(user.getEmail());
        }
        return false;
    }

    private User getCurrentUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(currentUsername).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StaffDTO> getStaffList(String search, String role, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        String cleanRoleFilter = null;
        if (role != null && !role.isBlank()) {
            cleanRoleFilter = normalizeRole(role);
        }

        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<User> page = userRepository.searchStaff(STAFF_ROLES, cleanSearch, cleanRoleFilter, pageable);
        List<StaffDTO> dtos = page.getContent().stream().map(this::toDTO).toList();

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffDTO getStaffDetail(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        validateStaffUser(user);
        return toDTO(user);
    }

    @Override
    public StaffDTO createStaff(CreateStaffRequest request, String currentUsername) {
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email đã tồn tại trong hệ thống: " + request.getEmail().trim());
        }

        String normalizedPhone = AuthService.normalizePhoneNumber(request.getPhone());
        if (userRepository.existsByPhone(normalizedPhone)) {
            throw new BadRequestException("Số điện thoại đã được đăng ký: " + normalizedPhone);
        }

        String roleName = normalizeRole(request.getRole());
        if ("ADMIN".equalsIgnoreCase(roleName)) {
            User currentUser = getCurrentUser(currentUsername);
            if (!isSuperAdmin(currentUsername, currentUser)) {
                throw new BadRequestException("Chỉ Quản trị viên tối cao mới có quyền tạo tài khoản Quản trị viên mới");
            }
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("Vai trò không hợp lệ trong hệ thống: " + request.getRole()));

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhone(normalizedPhone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setAddress("Văn phòng GreenPhone");

        user = userRepository.save(user);
        log.info("Quản trị viên đã tạo tài khoản nhân sự mới: email={}, role={}, thực hiện bởi={}",
                user.getEmail(), roleName, currentUsername);
        return toDTO(user);
    }

    @Override
    public StaffDTO updateStaffRole(Long id, UpdateStaffRoleRequest request, String currentUsername) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        validateStaffUser(targetUser);

        if (currentUsername != null && currentUsername.equalsIgnoreCase(targetUser.getEmail())) {
            throw new BadRequestException("Không thể tự thay đổi vai trò của chính mình để bảo đảm an toàn hệ thống");
        }

        if (isSuperAdmin(targetUser.getEmail(), targetUser)) {
            throw new BadRequestException("Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể thay đổi vai trò");
        }

        User currentUser = getCurrentUser(currentUsername);
        if (!isSuperAdmin(currentUsername, currentUser)) {
            if ("ADMIN".equalsIgnoreCase(targetUser.getRole().getName())) {
                throw new BadRequestException("Chỉ Quản trị viên tối cao mới có quyền điều chỉnh vai trò của Quản trị viên khác");
            }
            String newRoleName = normalizeRole(request.getRole());
            if ("ADMIN".equalsIgnoreCase(newRoleName)) {
                throw new BadRequestException("Chỉ Quản trị viên tối cao mới có quyền nâng cấp tài khoản lên Quản trị viên");
            }
        }

        String roleName = normalizeRole(request.getRole());
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("Vai trò không hợp lệ: " + request.getRole()));

        targetUser.setRole(role);
        targetUser = userRepository.save(targetUser);
        log.info("Cập nhật vai trò nhân viên id={}: role={}, thực hiện bởi={}", id, roleName, currentUsername);
        return toDTO(targetUser);
    }

    @Override
    public StaffDTO updateStaffStatus(Long id, String status, String currentUsername) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        validateStaffUser(targetUser);

        if (currentUsername != null && currentUsername.equalsIgnoreCase(targetUser.getEmail())) {
            throw new BadRequestException("Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");
        }

        if (isSuperAdmin(targetUser.getEmail(), targetUser)) {
            throw new BadRequestException("Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể bị khóa hoặc thay đổi trạng thái");
        }

        User currentUser = getCurrentUser(currentUsername);
        if ("ADMIN".equalsIgnoreCase(targetUser.getRole().getName())) {
            if (!isSuperAdmin(currentUsername, currentUser)) {
                throw new BadRequestException("Chỉ Quản trị viên tối cao mới có quyền khóa hoặc mở khóa tài khoản Quản trị viên khác");
            }
        }

        String upperStatus = status != null ? status.trim().toUpperCase() : "";
        if (!VALID_STATUSES.contains(upperStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + status);
        }

        targetUser.setStatus(upperStatus);
        targetUser = userRepository.save(targetUser);

        if ("BLOCKED".equals(upperStatus) || "INACTIVE".equals(upperStatus)) {
            if (userDeviceSessionRepository != null && targetUser.getId() != null) {
                userDeviceSessionRepository.revokeAllSessionsByUserId(targetUser.getId());
                log.info("Khóa tài khoản nhân sự id={}. Đã thu hồi toàn bộ phiên đăng nhập.", targetUser.getId());
            }
        }

        log.info("Cập nhật trạng thái nhân viên id={}: status={}, thực hiện bởi={}", id, upperStatus, currentUsername);
        return toDTO(targetUser);
    }

    private String normalizeRole(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) {
            throw new BadRequestException("Vai trò không được để trống");
        }
        String clean = rawRole.trim().toUpperCase();
        if (clean.startsWith("ROLE_")) {
            clean = clean.substring(5);
        }
        if (!STAFF_ROLES.contains(clean)) {
            throw new BadRequestException("Vai trò không thuộc danh mục nhân sự nội bộ: " + rawRole);
        }
        return clean;
    }

    private void validateStaffUser(User user) {
        if (user.getRole() == null || !STAFF_ROLES.contains(user.getRole().getName())) {
            throw new BadRequestException("Tài khoản người dùng này không thuộc danh mục nhân sự nội bộ");
        }
    }

    private StaffDTO toDTO(User user) {
        String roleStr = user.getRole() != null ? "ROLE_" + user.getRole().getName() : "ROLE_CUSTOMER";
        return StaffDTO.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(roleStr)
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
