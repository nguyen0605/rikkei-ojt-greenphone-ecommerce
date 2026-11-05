package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
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
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private JwtConfig jwtConfig;
    @Mock private AuthMapper authMapper;
    @Mock private UserMapper userMapper;
    @Mock private EmailService emailService;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AuthService authService;

    private Role customerRole;
    private User testUser;
    private RegisterRequest registerReq;
    private LoginRequest loginReq;

    @BeforeEach
    void setUp() {
        customerRole = new Role(); customerRole.setId(1L); customerRole.setName(RoleName.CUSTOMER.name());
        testUser = new User();
        testUser.setId(1L); testUser.setFullName("Test User"); testUser.setEmail("test@example.com");
        testUser.setPassword("encoded_password"); testUser.setPhone("0900000001");
        testUser.setStatus("ACTIVE"); testUser.setRole(customerRole);

        registerReq = new RegisterRequest();
        registerReq.setFullName("Test User"); registerReq.setEmail("test@example.com");
        registerReq.setPassword("password123"); registerReq.setPhone("0900000001");

        loginReq = new LoginRequest();
        loginReq.setEmail("test@example.com"); loginReq.setPassword("password123");

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    // === REGISTER ===

    @Test void register_Success() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(false);
        when(roleRepository.findByName(RoleName.CUSTOMER.name())).thenReturn(Optional.of(customerRole));
        when(authMapper.toEntity(registerReq)).thenReturn(testUser);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtTokenProvider.generateToken(any())).thenReturn("jwt_token_xyz");
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(any(), anyString(), anyLong()))
                .thenReturn(new AuthResponse(1L, "", "Test User", "test@example.com", "CUSTOMER", 86400000L));

        AuthResponse r = authService.register(registerReq);

        assertThat(r.getEmail()).isEqualTo("test@example.com");
        verify(valueOperations).set(eq("otp:test@example.com"), anyString(), eq(Duration.ofMinutes(5)));
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        verify(emailService).sendOTP(eq("test@example.com"), anyString());
    }

    @Test void register_AccountLocked() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerReq))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode()).isEqualTo("ACCOUNT_LOCKED"))
                .hasMessageContaining("Bạn đã nhập sai quá số lần quy định");
    }

    @Test void register_EmailAlreadyExists() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerReq))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already registered");
    }

    @Test void register_AlwaysCustomerRole() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(false);
        when(roleRepository.findByName(RoleName.CUSTOMER.name())).thenReturn(Optional.of(customerRole));
        when(authMapper.toEntity(registerReq)).thenReturn(testUser);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(jwtTokenProvider.generateToken(any())).thenReturn("jwt_token_xyz");
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(any(), anyString(), anyLong()))
                .thenReturn(new AuthResponse(1L, "", "", "", "", 0L));

        authService.register(registerReq);

        verify(roleRepository).findByName(RoleName.CUSTOMER.name());
        verify(roleRepository, never()).findByName(RoleName.ADMIN.name());
    }

    // === LOGIN ===

    @Test void login_Success() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encoded_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(UserPrincipal.class))).thenReturn("jwt_token_xyz");
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(eq(testUser), eq("jwt_token_xyz"), eq(86400000L)))
                .thenReturn(new AuthResponse(1L, "jwt_token_xyz", "Test User", "test@example.com", "CUSTOMER", 86400000L));

        AuthResponse r = authService.login(loginReq);
        assertThat(r.getToken()).isEqualTo("jwt_token_xyz");
        assertThat(r.getEmail()).isEqualTo("test@example.com");
    }

    @Test void login_WrongPassword_DoesNotRevealEmailExists() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encoded_password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(loginReq))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test void login_EmailNotFound_DoesNotRevealExistence() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> {
            LoginRequest r = new LoginRequest(); r.setEmail("nobody@example.com"); r.setPassword("x");
            authService.login(r);
        }).isInstanceOf(BadRequestException.class).hasMessageContaining("Invalid email or password");
    }

    @Test void login_AccountNotActive() {
        testUser.setStatus("UNVERIFIED");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encoded_password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(loginReq))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not active");
    }

    // === VERIFY OTP ===

    @Test void verifyOTP_Success() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(valueOperations.get("otp:test@example.com")).thenReturn("123456");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(jwtTokenProvider.generateToken(any())).thenReturn("jwt_token");
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(any(), anyString(), anyLong()))
                .thenReturn(new AuthResponse(1L, "jwt_token", "Test User", "test@example.com", "CUSTOMER", 86400000L));

        AuthResponse r = authService.verifyOTP("test@example.com", "123456");

        assertThat(r.getToken()).isEqualTo("jwt_token");
        verify(redisTemplate).delete("otp:test@example.com");
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        assertThat(testUser.getStatus()).isEqualTo("ACTIVE");
    }

    @Test void verifyOTP_AccountLocked() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "123456"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode()).isEqualTo("ACCOUNT_LOCKED"))
                .hasMessageContaining("Bạn đã nhập sai quá số lần quy định");
    }

    @Test void verifyOTP_BlankInput() {
        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "   "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không được để trống");
    }

    @Test void verifyOTP_ExpiredOrNotFound() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(valueOperations.get("otp:test@example.com")).thenReturn(null);

        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mã OTP không hợp lệ hoặc đã hết hạn");
    }

    @Test void verifyOTP_WrongCode_IncrementsAttempts() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(valueOperations.get("otp:test@example.com")).thenReturn("123456");
        when(valueOperations.increment("otp_attempts:test@example.com")).thenReturn(1L);

        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "999999"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mã OTP không chính xác. Bạn còn 4 lần thử.");

        verify(redisTemplate).expire("otp_attempts:test@example.com", Duration.ofMinutes(15));
    }

    @Test void verifyOTP_ExceedMaxAttempts_DeletesOtpAndLocksAccount() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(valueOperations.get("otp:test@example.com")).thenReturn("123456");
        when(valueOperations.increment("otp_attempts:test@example.com")).thenReturn(5L);

        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "999999"))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode()).isEqualTo("ACCOUNT_LOCKED"))
                .hasMessageContaining("Bạn đã nhập sai quá số lần quy định");

        verify(redisTemplate).delete("otp:test@example.com");
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        verify(valueOperations).set("otp_lock:test@example.com", "LOCKED", Duration.ofMinutes(15));
    }

    // === FORGOT & RESET PASSWORD ===

    @Test void forgotPassword_SilentlyAcceptsUnknownEmail() {
        when(redisTemplate.hasKey("otp_lock:nobody@example.com")).thenReturn(false);
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        authService.forgotPassword("nobody@example.com");

        verify(emailService, never()).sendOTP(any(), any());
    }

    @Test void forgotPassword_SendsOTP_ForKnownEmail() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        authService.forgotPassword("test@example.com");

        verify(valueOperations).set(eq("otp:test@example.com"), anyString(), eq(Duration.ofMinutes(5)));
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        verify(emailService).sendOTP(eq("test@example.com"), anyString());
    }

    @Test void resetPassword_Success() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(valueOperations.get("otp:test@example.com")).thenReturn("123456");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("newPassword123")).thenReturn("encoded_new");

        authService.resetPassword("test@example.com", "123456", "newPassword123");

        verify(redisTemplate).delete("otp:test@example.com");
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        verify(userRepository).save(testUser);
        assertThat(testUser.getPassword()).isEqualTo("encoded_new");
    }

    // === RESEND OTP ===

    @Test void resendOTP_Success() {
        when(redisTemplate.hasKey("otp_lock:test@example.com")).thenReturn(false);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        authService.resendOTP("test@example.com");

        verify(valueOperations).set(eq("otp:test@example.com"), anyString(), eq(Duration.ofMinutes(5)));
        verify(redisTemplate).delete("otp_attempts:test@example.com");
        verify(emailService).sendOTP(eq("test@example.com"), anyString());
    }

    // === GET CURRENT USER ===

    @Test void getCurrentUser_Success() {
        UserPrincipal principal = UserPrincipal.create(testUser);
        UserDTO dto = new UserDTO(); dto.setEmail("test@example.com");
        try (MockedStatic<SecurityUtils> m = mockStatic(SecurityUtils.class)) {
            m.when(SecurityUtils::getCurrentUser).thenReturn(principal);
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(userMapper.toDto(testUser)).thenReturn(dto);
            assertThat(authService.getCurrentUser().getEmail()).isEqualTo("test@example.com");
        }
    }
}
