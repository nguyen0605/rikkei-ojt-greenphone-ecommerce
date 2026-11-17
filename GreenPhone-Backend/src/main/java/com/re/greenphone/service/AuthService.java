package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.exception.UnauthorizedException;
import com.re.greenphone.config.JwtConfig;
import com.re.greenphone.dto.request.LoginRequest;
import com.re.greenphone.dto.request.RegisterRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.dto.response.UserDTO;
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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    public static final String ERROR_CODE_ACCOUNT_LOCKED = "ACCOUNT_LOCKED";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtConfig jwtConfig;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;
    private final EmailService emailService;
    private final StringRedisTemplate redisTemplate;
    private final com.re.greenphone.repository.UserDeviceSessionRepository userDeviceSessionRepository;
    private final DeviceSessionService deviceSessionService;

    private static final String OTP_PREFIX = "otp:";
    private static final String OTP_ATTEMPTS_PREFIX = "otp_attempts:";
    private static final String OTP_LOCK_PREFIX = "otp_lock:";
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final String USER_REFRESH_TOKEN_PREFIX = "user_refresh_token:";
    public static final String BLACKLIST_TOKEN_PREFIX = "blacklist:";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final Duration LOCK_TTL = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 5;

    private static final SecureRandom RANDOM = new SecureRandom();

    // ===== REGISTER =====

    public AuthResponse register(RegisterRequest request) {
        checkAccountLocked(request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email này đã được đăng ký. Vui lòng sử dụng email khác.");
        }

        // Customer self-registration is ALWAYS CUSTOMER role
        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER.name())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + RoleName.CUSTOMER.name()));

        User user = authMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(customerRole);
        user.setStatus("ACTIVE"); // simplified flow

        User saved = userRepository.save(user);

        // Generate 6-digit OTP and cache in Redis with 5-minute TTL
        String otp = generateOTP();
        redisTemplate.opsForValue().set(OTP_PREFIX + saved.getEmail(), otp, OTP_TTL);
        redisTemplate.delete(OTP_ATTEMPTS_PREFIX + saved.getEmail());
        log.info("[OTP] Generated verification code for {}: {}", saved.getEmail(), otp);
        emailService.sendOTP(saved.getEmail(), otp);

        String token = jwtTokenProvider.generateToken(UserPrincipal.create(saved));
        String refreshToken = createAndStoreRefreshToken(saved.getId());
        return authMapper.toAuthResponse(saved, token, refreshToken, jwtConfig.getExpiration());
    }

    // ===== LOGIN =====

    public AuthResponse login(LoginRequest request) {
        return login(request, null);
    }

    public AuthResponse login(LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        // Don't reveal whether email exists → use same error message for both cases
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Email hoặc mật khẩu không đúng."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Email hoặc mật khẩu không đúng.");
        }

        if ("BLOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản đã bị khóa. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
        }
        if ("UNVERIFIED".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt. Vui lòng xác thực email của bạn.");
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản không hoạt động. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
        }

        long ttlMs = jwtConfig.getRefreshExpiration() > 0 ? jwtConfig.getRefreshExpiration() : 604800000L;
        String refreshToken = UUID.randomUUID().toString();
        storeRefreshTokenInRedis(user.getId(), refreshToken, ttlMs);

        // Ghi nhận phiên làm việc đa thiết bị
        deviceSessionService.recordSession(user, refreshToken, ttlMs, httpRequest);

        // Tìm session vừa tạo để đưa sessionId vào token
        String tokenHash = deviceSessionService.hashToken(refreshToken);
        Long sessionId = userDeviceSessionRepository.findByRefreshTokenHash(tokenHash)
                .map(com.re.greenphone.entity.UserDeviceSession::getId)
                .orElse(null);

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtTokenProvider.generateToken(principal, sessionId);
        return authMapper.toAuthResponse(user, token, refreshToken, jwtConfig.getExpiration());
    }

    // ===== REFRESH TOKEN =====

    public AuthResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadRequestException("Refresh token không được để trống.");
        }

        String rawToken = refreshToken.trim();
        String tokenHash = deviceSessionService.hashToken(rawToken);

        // Kiểm tra phiên thiết bị trong Database (Device Session Security - Source of Truth)
        var sessionOpt = userDeviceSessionRepository.findByRefreshTokenHash(tokenHash);
        if (sessionOpt.isPresent()) {
            var session = sessionOpt.get();
            if (Boolean.TRUE.equals(session.getIsRevoked())) {
                log.warn("Refresh attempt with revoked session id={}", session.getId());
                throw new UnauthorizedException("Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.");
            }
            if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
                log.warn("Refresh attempt with expired session id={}", session.getId());
                throw new UnauthorizedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            }
        }

        String userIdStr = redisTemplate.opsForValue().get(REFRESH_TOKEN_PREFIX + rawToken);
        if (userIdStr == null && sessionOpt.isEmpty()) {
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        Long userId;
        try {
            if (userIdStr != null) {
                userId = Long.parseLong(userIdStr);
            } else {
                userId = sessionOpt.get().getUser().getId();
            }
        } catch (NumberFormatException e) {
            throw new UnauthorizedException("Token làm mới không hợp lệ.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if ("BLOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản đã bị khóa. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản không hoạt động. Vui lòng liên hệ với quản trị viên để được hỗ trợ.");
        }

        long ttlMs = jwtConfig.getRefreshExpiration() > 0 ? jwtConfig.getRefreshExpiration() : 604800000L;
        String newRefreshToken = UUID.randomUUID().toString();
        String newHash = deviceSessionService.hashToken(newRefreshToken);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime newExpiresAt = now.plusSeconds(ttlMs / 1000);

        // Atomic Token Rotation: Cập nhật có điều kiện trên Database
        Long sessionId = null;
        if (sessionOpt.isPresent()) {
            var session = sessionOpt.get();
            sessionId = session.getId();
            int updated = userDeviceSessionRepository.rotateSessionTokenAtomically(
                    sessionId, tokenHash, newHash, now, newExpiresAt);
            if (updated == 0) {
                log.warn("Atomic token rotation failed for session id={}. Race condition or session revoked.", sessionId);
                throw new UnauthorizedException("Phiên làm việc đã bị thay đổi hoặc thu hồi.");
            }
        }

        // Cập nhật Redis song song
        storeRefreshTokenInRedis(user.getId(), newRefreshToken, ttlMs);
        try {
            redisTemplate.delete(REFRESH_TOKEN_PREFIX + rawToken);
        } catch (Exception ignored) {}

        UserPrincipal principal = UserPrincipal.create(user);
        String newAccessToken = jwtTokenProvider.generateToken(principal, sessionId);

        return authMapper.toAuthResponse(user, newAccessToken, newRefreshToken, jwtConfig.getExpiration());
    }

    // ===== LOGOUT =====

    public void logout(String authHeaderOrToken) {
        if (authHeaderOrToken == null || authHeaderOrToken.isBlank()) {
            return;
        }

        String token = authHeaderOrToken;
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        token = token.trim();
        if (token.isEmpty()) {
            return;
        }

        try {
            long remainingTtl = jwtTokenProvider.getRemainingExpiration(token);
            if (remainingTtl > 0) {
                redisTemplate.opsForValue().set(
                        BLACKLIST_TOKEN_PREFIX + token,
                        "revoked",
                        remainingTtl,
                        TimeUnit.MILLISECONDS);
                log.info("Token successfully blacklisted for remaining {} ms", remainingTtl);
            }

            Long userId = jwtTokenProvider.getUserIdFromToken(token);
            Long sessionId = jwtTokenProvider.getSessionIdFromToken(token);
            if (userId != null && sessionId != null) {
                try {
                    deviceSessionService.revokeSession(userId, sessionId);
                } catch (Exception ex) {
                    log.debug("Session already revoked or not found: {}", ex.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during logout: {}", e.getMessage());
        }
    }

    // ===== ME =====

    @Transactional(readOnly = true)
    public UserDTO getCurrentUser() {
        UserPrincipal principal = SecurityUtils.getCurrentUser();
        if (principal == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập.");
        }
        User user = userRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return userMapper.toDto(user);
    }

    // ===== OTP VERIFICATION =====

    public AuthResponse verifyOTP(String email, String otp) {
        validateAndConsumeOTP(email, otp);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus("ACTIVE");
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(UserPrincipal.create(user));
        String refreshToken = createAndStoreRefreshToken(user.getId());
        return authMapper.toAuthResponse(user, token, refreshToken, jwtConfig.getExpiration());
    }

    // ===== FORGOT / RESET PASSWORD =====

    public void forgotPassword(String email) {
        checkAccountLocked(email);
        // Don't reveal whether email exists — silently accept
        userRepository.findByEmail(email).ifPresent(user -> {
            String otp = generateOTP();
            redisTemplate.opsForValue().set(OTP_PREFIX + email, otp, OTP_TTL);
            redisTemplate.delete(OTP_ATTEMPTS_PREFIX + email);
            log.info("[OTP] Forgot password code for {}: {}", email, otp);
            emailService.sendOTP(email, otp);
        });
    }

    public AuthResponse resetPassword(String email, String otp, String newPassword) {
        validateAndConsumeOTP(email, otp);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("[AUTH] Password reset successfully for email: {}. Generating auto-login tokens.", email);
        String token = jwtTokenProvider.generateToken(UserPrincipal.create(user));
        String refreshToken = createAndStoreRefreshToken(user.getId());
        return authMapper.toAuthResponse(user, token, refreshToken, jwtConfig.getExpiration());
    }

    public void resendOTP(String email) {
        checkAccountLocked(email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String otp = generateOTP();
        redisTemplate.opsForValue().set(OTP_PREFIX + email, otp, OTP_TTL);
        redisTemplate.delete(OTP_ATTEMPTS_PREFIX + email);
        log.info("[OTP] Resent verification code for {}: {}", email, otp);
        emailService.sendOTP(email, otp);
    }

    // ===== HELPERS =====

    private void checkAccountLocked(String email) {
        if (email != null && Boolean.TRUE.equals(redisTemplate.hasKey(OTP_LOCK_PREFIX + email))) {
            Long ttlSeconds = redisTemplate.getExpire(OTP_LOCK_PREFIX + email, TimeUnit.SECONDS);
            String waitTime = "15 phút";
            if (ttlSeconds != null && ttlSeconds > 0) {
                long minutes = (ttlSeconds + 59) / 60;
                waitTime = minutes > 1 ? minutes + " phút" : ttlSeconds + " giây";
            }
            throw new BadRequestException(
                    "Bạn đã nhập sai quá số lần quy định. Tài khoản đang tạm khóa bảo mật, vui lòng yêu cầu mã mới sau "
                            + waitTime + ".",
                    ERROR_CODE_ACCOUNT_LOCKED);
        }
    }

    private void validateAndConsumeOTP(String email, String otp) {
        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            throw new BadRequestException("Email và mã OTP không được để trống");
        }

        checkAccountLocked(email);

        String storedOTP = redisTemplate.opsForValue().get(OTP_PREFIX + email);
        if (storedOTP == null) {
            throw new BadRequestException("Mã OTP không hợp lệ hoặc đã hết hạn");
        }

        if (!storedOTP.equals(otp.trim())) {
            Long attempts = redisTemplate.opsForValue().increment(OTP_ATTEMPTS_PREFIX + email);
            long currentAttempts = attempts != null ? attempts : 1L;
            if (currentAttempts == 1L) {
                redisTemplate.expire(OTP_ATTEMPTS_PREFIX + email, LOCK_TTL);
            }

            if (currentAttempts >= MAX_ATTEMPTS) {
                redisTemplate.delete(OTP_PREFIX + email);
                redisTemplate.delete(OTP_ATTEMPTS_PREFIX + email);
                redisTemplate.opsForValue().set(OTP_LOCK_PREFIX + email, "LOCKED", LOCK_TTL);
                log.warn("Tài khoản {} đã nhập sai OTP quá {} lần. Mã OTP đã bị hủy và khóa 15 phút.", email,
                        MAX_ATTEMPTS);
                throw new BadRequestException(
                        "Bạn đã nhập sai quá số lần quy định. Mã xác thực đã bị hủy để bảo vệ tài khoản, vui lòng yêu cầu mã mới sau 15 phút.",
                        ERROR_CODE_ACCOUNT_LOCKED);
            } else {
                long remaining = MAX_ATTEMPTS - currentAttempts;
                throw new BadRequestException("Mã OTP không chính xác. Bạn còn " + remaining + " lần thử.");
            }
        }

        // Xác thực thành công: dọn dẹp key OTP và attempts
        redisTemplate.delete(OTP_PREFIX + email);
        redisTemplate.delete(OTP_ATTEMPTS_PREFIX + email);
    }

    private String generateOTP() {
        int otp = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(otp);
    }

    private void storeRefreshTokenInRedis(Long userId, String refreshToken, long ttlMs) {
        try {
            redisTemplate.opsForValue().set(REFRESH_TOKEN_PREFIX + refreshToken, String.valueOf(userId), ttlMs,
                    TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("Redis unavailable for storing refresh token, proceeding: {}", e.getMessage());
        }
    }

    private String createAndStoreRefreshToken(Long userId) {
        String refreshToken = UUID.randomUUID().toString();
        long ttlMs = jwtConfig.getRefreshExpiration() > 0 ? jwtConfig.getRefreshExpiration() : 604800000L;
        storeRefreshTokenInRedis(userId, refreshToken, ttlMs);
        return refreshToken;
    }
}
