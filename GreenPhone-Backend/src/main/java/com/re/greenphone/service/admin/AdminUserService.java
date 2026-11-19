package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.UserDTO;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.UserDeviceSessionRepository;
import com.re.greenphone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final UserDeviceSessionRepository userDeviceSessionRepository;

    public PageResponse<UserDTO> getUsers(String search, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<User> page;
        if (search != null && !search.isBlank()) {
            page = userRepository.searchByEmailOrName(search, pageable);
        } else {
            page = userRepository.findAll(pageable);
        }

        List<UserDTO> dtos = userMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public UserDTO getUserDetail(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toDto(user);
    }

    public UserDTO updateUserStatus(Long id, String status, String currentUsername) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (currentUsername != null && currentUsername.equalsIgnoreCase(targetUser.getEmail())) {
            throw new com.re.greenphone.common.exception.BadRequestException(
                    "Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");
        }

        boolean isSuperAdmin = (targetUser.getId() != null && targetUser.getId() == 1L)
                || "admin@greenphone.vn".equalsIgnoreCase(targetUser.getEmail());
        if (isSuperAdmin) {
            throw new com.re.greenphone.common.exception.BadRequestException(
                    "Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể bị khóa");
        }

        if (targetUser.getRole() != null && "ADMIN".equalsIgnoreCase(targetUser.getRole().getName())) {
            User currentUser = currentUsername != null ? userRepository.findByEmail(currentUsername).orElse(null) : null;
            boolean isCallerSuperAdmin = currentUser != null
                    && ((currentUser.getId() != null && currentUser.getId() == 1L)
                    || "admin@greenphone.vn".equalsIgnoreCase(currentUser.getEmail()));
            if (!isCallerSuperAdmin) {
                throw new com.re.greenphone.common.exception.BadRequestException(
                        "Chỉ Quản trị viên tối cao mới có quyền khóa hoặc mở khóa tài khoản Quản trị viên khác");
            }
        }

        String upperStatus = status != null ? status.trim().toUpperCase() : "ACTIVE";
        if ("LOCKED".equals(upperStatus)) {
            upperStatus = "BLOCKED";
        }
        targetUser.setStatus(upperStatus);
        targetUser = userRepository.save(targetUser);

        if ("BLOCKED".equals(upperStatus) || "INACTIVE".equals(upperStatus)) {
            if (userDeviceSessionRepository != null && targetUser.getId() != null) {
                userDeviceSessionRepository.revokeAllSessionsByUserId(targetUser.getId());
                log.info("Khóa tài khoản khách hàng id={}. Đã thu hồi toàn bộ phiên đăng nhập.", targetUser.getId());
            }
        }
        return userMapper.toDto(targetUser);
    }
}
