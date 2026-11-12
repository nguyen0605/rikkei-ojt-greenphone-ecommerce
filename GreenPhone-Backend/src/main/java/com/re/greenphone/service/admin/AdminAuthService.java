package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.config.JwtConfig;
import com.re.greenphone.dto.request.LoginRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.AuthMapper;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminAuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtConfig jwtConfig;
    private final AuthMapper authMapper;
    private final AuthenticationManager authenticationManager;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (DisabledException | LockedException e) {
            // Tài khoản bị vô hiệu hóa hoặc bị khóa — tra cứu trạng thái thực tế để trả thông báo tiếng Việt rõ ràng
            User blocked = userRepository.findByEmail(request.getEmail()).orElse(null);
            if (blocked != null && "BLOCKED".equalsIgnoreCase(blocked.getStatus())) {
                throw new BadRequestException("Tài khoản đã bị khóa. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
            }
            throw new BadRequestException("Tài khoản không hoạt động. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
        } catch (BadCredentialsException e) {
            throw new BadRequestException("Email hoặc mật khẩu không đúng.");
        }

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản quản trị."));

        String roleName = user.getRole() != null ? user.getRole().getName() : "";
        if (!java.util.List.of("ADMIN", "SALES", "WAREHOUSE", "MARKETING").contains(roleName)) {
            throw new BadRequestException("Tài khoản không có quyền truy cập hệ thống quản trị.");
        }

        String token = jwtTokenProvider.generateToken(principal);
        return authMapper.toAuthResponse(user, token, jwtConfig.getExpiration());
    }
}
