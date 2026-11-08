package com.re.greenphone.security;

import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    private StringWriter responseWriter;

    @BeforeEach
    void setUp() throws IOException {
        SecurityContextHolder.clearContext();
        responseWriter = new StringWriter();
        lenient().when(response.getWriter()).thenReturn(new PrintWriter(responseWriter));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_PublicPath_SkipsFilter() throws ServletException, IOException {
        when(request.getRequestURI()).thenReturn("/api/auth/login");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtTokenProvider, redisTemplate, userRepository);
    }

    @Test
    void doFilterInternal_RevokedToken_Returns401Revoked() throws ServletException, IOException {
        when(request.getRequestURI()).thenReturn("/api/auth/me");
        when(request.getHeader("Authorization")).thenReturn("Bearer revoked_token");
        when(redisTemplate.hasKey("blacklist:revoked_token")).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(responseWriter.toString()).contains("Token has been revoked");
        verify(filterChain, never()).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_ValidToken_ActiveUser_SetsAuthentication() throws ServletException, IOException {
        User user = new User();
        user.setId(1L);
        user.setEmail("user@example.com");
        user.setFullName("User Name");
        user.setStatus("ACTIVE");
        Role role = new Role();
        role.setName("CUSTOMER");
        user.setRole(role);

        when(request.getRequestURI()).thenReturn("/api/auth/me");
        when(request.getHeader("Authorization")).thenReturn("Bearer valid_token");
        when(redisTemplate.hasKey("blacklist:valid_token")).thenReturn(false);
        when(jwtTokenProvider.validateToken("valid_token")).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromToken("valid_token")).thenReturn("user@example.com");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("user@example.com");
    }

    @Test
    void doFilterInternal_ValidToken_InactiveUser_Returns403() throws ServletException, IOException {
        User user = new User();
        user.setId(1L);
        user.setEmail("user@example.com");
        user.setStatus("LOCKED");

        when(request.getRequestURI()).thenReturn("/api/auth/me");
        when(request.getHeader("Authorization")).thenReturn("Bearer valid_token");
        when(redisTemplate.hasKey("blacklist:valid_token")).thenReturn(false);
        when(jwtTokenProvider.validateToken("valid_token")).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromToken("valid_token")).thenReturn("user@example.com");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        assertThat(responseWriter.toString()).contains("User account is not active");
        verify(filterChain, never()).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_InvalidToken_Returns401() throws ServletException, IOException {
        when(request.getRequestURI()).thenReturn("/api/auth/me");
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid_token");
        when(redisTemplate.hasKey("blacklist:invalid_token")).thenReturn(false);
        when(jwtTokenProvider.validateToken("invalid_token")).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(responseWriter.toString()).contains("Token expired or invalid");
        verify(filterChain, never()).doFilter(request, response);
    }
}

