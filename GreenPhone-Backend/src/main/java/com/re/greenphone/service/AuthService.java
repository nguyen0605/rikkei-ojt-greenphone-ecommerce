package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.exception.UnauthorizedException;
import com.re.greenphone.config.JwtConfig;
import com.re.greenphone.dto.request.LoginRequest;
import com.re.greenphone.dto.request.RegisterRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.enums.RoleName;
import com.re.greenphone.mapper.AuthMapper;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.RoleRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtConfig jwtConfig;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;
    private final EmailService emailService;

    private final Map<String, String> otpCache = new ConcurrentHashMap<>();
    private static final SecureRandom RANDOM = new SecureRandom();

    // ===== REGISTER =====

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER.name())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        User user = authMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus("UNVERIFIED");
        user.setRole(customerRole);
        user = userRepository.save(user);

        String otp = generateOTP();
        otpCache.put(request.getEmail(), otp);
        emailService.sendOTP(request.getEmail(), otp);

        return authMapper.toAuthResponse(user, "", jwtConfig.getExpiration());
    }

    // ===== LOGIN — manual verification, no AuthenticationManager =====

    public AuthResponse login(LoginRequest request) {
        // Don't reveal whether email exists → use same error message for both cases
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new BadRequestException("Account is not active. Please verify your email.");
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtTokenProvider.generateToken(principal);
        return authMapper.toAuthResponse(user, token, jwtConfig.getExpiration());
    }

    // ===== CURRENT USER =====

    public com.re.greenphone.dto.response.UserDTO getCurrentUser() {
        UserPrincipal principal = SecurityUtils.getCurrentUser();
        User user = userRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return userMapper.toDto(user);
    }

    // ===== OTP =====

    public AuthResponse verifyOTP(String email, String otp) {
        String storedOTP = otpCache.get(email);
        if (storedOTP == null || !storedOTP.equals(otp)) {
            throw new BadRequestException("Invalid or expired OTP");
        }
        otpCache.remove(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus("ACTIVE");
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(UserPrincipal.create(user));
        return authMapper.toAuthResponse(user, token, jwtConfig.getExpiration());
    }

    // ===== FORGOT / RESET PASSWORD =====

    public void forgotPassword(String email) {
        // Don't reveal whether email exists — silently accept
        userRepository.findByEmail(email).ifPresent(user -> {
            String otp = generateOTP();
            otpCache.put(email, otp);
            emailService.sendOTP(email, otp);
        });
    }

    public void resetPassword(String email, String otp, String newPassword) {
        String storedOTP = otpCache.get(email);
        if (storedOTP == null || !storedOTP.equals(otp)) {
            throw new BadRequestException("Invalid or expired OTP");
        }
        otpCache.remove(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void resendOTP(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String otp = generateOTP();
        otpCache.put(email, otp);
        emailService.sendOTP(email, otp);
    }

    // ===== HELPERS =====

    private String generateOTP() {
        int otp = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(otp);
    }
}
