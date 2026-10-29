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
import org.springframework.security.crypto.password.PasswordEncoder;

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
    }

    // === REGISTER ===

    @Test void register_Success() {
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(false);
        when(roleRepository.findByName(RoleName.CUSTOMER.name())).thenReturn(Optional.of(customerRole));
        when(authMapper.toEntity(registerReq)).thenReturn(testUser);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(any(), anyString(), anyLong()))
                .thenReturn(new AuthResponse(1L, "", "Test User", "test@example.com", "CUSTOMER", 86400000L));
        AuthResponse r = authService.register(registerReq);
        assertThat(r.getEmail()).isEqualTo("test@example.com");
        verify(emailService).sendOTP(eq("test@example.com"), anyString());
    }

    @Test void register_EmailAlreadyExists() {
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(true);
        assertThatThrownBy(() -> authService.register(registerReq))
                .isInstanceOf(ConflictException.class).hasMessageContaining("Email already registered");
    }

    @Test void register_AlwaysCustomerRole() {
        when(userRepository.existsByEmail(registerReq.getEmail())).thenReturn(false);
        when(roleRepository.findByName(RoleName.CUSTOMER.name())).thenReturn(Optional.of(customerRole));
        when(authMapper.toEntity(registerReq)).thenReturn(testUser);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(testUser);
        when(jwtConfig.getExpiration()).thenReturn(86400000L);
        when(authMapper.toAuthResponse(any(), anyString(), anyLong()))
                .thenReturn(new AuthResponse(1L, "", "", "", "", 0L));
        authService.register(registerReq);
        verify(roleRepository).findByName(RoleName.CUSTOMER.name());
        verify(roleRepository, never()).findByName(RoleName.ADMIN.name());
    }

    // === LOGIN (manual verification, no AuthenticationManager) ===

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

    // === OTP ===

    @Test void verifyOTP_Invalid() {
        assertThatThrownBy(() -> authService.verifyOTP("test@example.com", "000000"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Invalid or expired OTP");
    }

    // === FORGOT PASSWORD (now silently accepts unknown email) ===

    @Test void forgotPassword_SilentlyAcceptsUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        // Should NOT throw — silently accept
        authService.forgotPassword("nobody@example.com");
        verify(emailService, never()).sendOTP(any(), any());
    }

    @Test void forgotPassword_SendsOTP_ForKnownEmail() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        authService.forgotPassword("test@example.com");
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
