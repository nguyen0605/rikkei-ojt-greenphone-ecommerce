package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.UpdateUserStatusRequest;
import com.re.greenphone.dto.response.UserDTO;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.UserDeviceSessionRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.service.EmailService;
import com.re.greenphone.service.TokenRedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final UserDeviceSessionRepository userDeviceSessionRepository;
    @Lazy
    private final EmailService emailService;
    private final TokenRedisService tokenRedisService;

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
        return updateUserStatus(id, new UpdateUserStatusRequest(status, "Khóa tài khoản bởi quản trị viên hệ thống"), currentUsername);
    }

    public UserDTO updateUserStatus(Long id, UpdateUserStatusRequest request, String currentUsername) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (currentUsername != null && currentUsername.equalsIgnoreCase(targetUser.getEmail())) {
            throw new BadRequestException(
                    "Không thể tự thay đổi trạng thái hoặc khóa tài khoản của chính mình");
        }

        boolean isSuperAdmin = (targetUser.getId() != null && targetUser.getId() == 1L)
                || "admin@greenphone.vn".equalsIgnoreCase(targetUser.getEmail());
        if (isSuperAdmin) {
            throw new BadRequestException(
                    "Tài khoản Quản trị viên tối cao là bất khả xâm phạm, không thể bị khóa");
        }

        if (targetUser.getRole() != null && "ADMIN".equalsIgnoreCase(targetUser.getRole().getName())) {
            User currentUser = currentUsername != null ? userRepository.findByEmail(currentUsername).orElse(null) : null;
            boolean isCallerSuperAdmin = currentUser != null
                    && ((currentUser.getId() != null && currentUser.getId() == 1L)
                    || "admin@greenphone.vn".equalsIgnoreCase(currentUser.getEmail()));
            if (!isCallerSuperAdmin) {
                throw new BadRequestException(
                        "Chỉ Quản trị viên tối cao mới có quyền khóa hoặc mở khóa tài khoản Quản trị viên khác");
            }
        }

        String rawStatus = request != null && request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE";
        if ("LOCKED".equals(rawStatus)) {
            rawStatus = "BLOCKED";
        }

        if ("BLOCKED".equals(rawStatus)) {
            String reason = request != null && request.getReason() != null ? request.getReason().trim() : null;
            if (reason == null || reason.length() < 10) {
                throw new BadRequestException(
                        "Bắt buộc Admin phải nhập lý do khóa tài khoản với độ dài tối thiểu 10 ký tự.");
            }

            targetUser.setStatus("BLOCKED");
            targetUser.setBlockedReason(reason);
            targetUser.setBlockedAt(LocalDateTime.now());
            targetUser.setBlockedBy(currentUsername != null ? currentUsername : "SUPER_ADMIN");
            targetUser = userRepository.save(targetUser);

            // Thu hồi toàn bộ phiên đăng nhập đa thiết bị ngay lập tức
            if (userDeviceSessionRepository != null && targetUser.getId() != null) {
                userDeviceSessionRepository.revokeAllSessionsByUserId(targetUser.getId());
                log.info("Khóa tài khoản khách hàng id={}. Đã thu hồi toàn bộ Device Sessions.", targetUser.getId());
            }

            // Thu hồi Refresh Token trên Redis whitelist ngay lập tức
            if (tokenRedisService != null && targetUser.getId() != null) {
                tokenRedisService.deleteRefreshToken(targetUser.getId());
                log.info("Khóa tài khoản khách hàng id={}. Đã xóa Refresh Token khỏi Redis whitelist.", targetUser.getId());
            }

            // Gửi email thông báo bất đồng bộ (@Async) ngay lập tức
            if (emailService != null && targetUser.getEmail() != null) {
                String ticketId = "TK-BLOCKED-" + targetUser.getId() + "-" + (System.currentTimeMillis() % 1000000);
                try {
                    emailService.sendAccountBlockedEmail(
                            targetUser.getEmail(),
                            targetUser.getFullName(),
                            targetUser.getBlockedReason(),
                            targetUser.getBlockedAt(),
                            ticketId
                    );
                    log.info("Đã kích hoạt gửi email thông báo khóa tài khoản tới {}", targetUser.getEmail());
                } catch (Exception mailEx) {
                    log.error("Không thể gửi email thông báo khóa tài khoản: {}", mailEx.getMessage());
                }
            }
        } else {
            // Mở khóa tài khoản
            targetUser.setStatus(rawStatus);
            targetUser.setBlockedReason(null);
            targetUser.setBlockedAt(null);
            targetUser.setBlockedBy(null);
            targetUser = userRepository.save(targetUser);
            log.info("Mở khóa tài khoản khách hàng id={}. Trạng thái mới: {}", targetUser.getId(), rawStatus);
        }

        return userMapper.toDto(targetUser);
    }
}
