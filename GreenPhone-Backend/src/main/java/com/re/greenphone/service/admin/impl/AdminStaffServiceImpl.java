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

    private static final List<String> STAFF_ROLES = List.of("ADMIN", "SALES", "WAREHOUSE", "MARKETING");
    private static final List<String> VALID_STATUSES = List.of("ACTIVE", "INACTIVE", "BLOCKED");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

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
    public StaffDTO createStaff(CreateStaffRequest request) {
        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email đã tồn tại trong hệ thống: " + request.getEmail().trim());
        }

        if (userRepository.existsByPhone(request.getPhone().trim())) {
            throw new BadRequestException("Số điện thoại đã được đăng ký: " + request.getPhone().trim());
        }

        String roleName = normalizeRole(request.getRole());
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("Vai trò không hợp lệ trong hệ thống: " + request.getRole()));

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhone(request.getPhone().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setAddress("Văn phòng GreenPhone");

        user = userRepository.save(user);
        log.info("Quản trị viên đã tạo tài khoản nhân sự mới: email={}, role={}", user.getEmail(), roleName);
        return toDTO(user);
    }

    @Override
    public StaffDTO updateStaffRole(Long id, UpdateStaffRoleRequest request, String currentUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        validateStaffUser(user);

        if (currentUsername != null && currentUsername.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Không thể tự thay đổi vai trò của chính mình để bảo đảm an toàn hệ thống");
        }

        String roleName = normalizeRole(request.getRole());
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("Vai trò không hợp lệ: " + request.getRole()));

        user.setRole(role);
        user = userRepository.save(user);
        log.info("Cập nhật vai trò nhân viên id={}: role={}", id, roleName);
        return toDTO(user);
    }

    @Override
    public StaffDTO updateStaffStatus(Long id, String status, String currentUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        validateStaffUser(user);

        if (currentUsername != null && currentUsername.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");
        }

        String upperStatus = status != null ? status.trim().toUpperCase() : "";
        if (!VALID_STATUSES.contains(upperStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + status);
        }

        user.setStatus(upperStatus);
        user = userRepository.save(user);
        log.info("Cập nhật trạng thái nhân viên id={}: status={}", id, upperStatus);
        return toDTO(user);
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
