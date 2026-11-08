package com.re.greenphone.security;

import com.re.greenphone.config.JwtConfig;
import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @Mock
    private JwtConfig jwtConfig;

    @InjectMocks
    private JwtTokenProvider jwtTokenProvider;

    private static final String SECRET_KEY = "mySuperSecretKeyForJwtTestingPurposesWhichIsLongEnough123456";

    @BeforeEach
    void setUp() {
        when(jwtConfig.getSecret()).thenReturn(SECRET_KEY);
    }

    @Test
    void tokenLifecycle_Generate_Validate_ParseClaims() {
        when(jwtConfig.getExpiration()).thenReturn(1800000L); // 30 minutes

        User user = new User();
        user.setId(100L);
        user.setEmail("user@example.com");
        user.setPassword("secret");
        user.setFullName("User Name");
        user.setStatus("ACTIVE");
        Role role = new Role();
        role.setName("CUSTOMER");
        user.setRole(role);

        UserPrincipal principal = UserPrincipal.create(user);

        String token = jwtTokenProvider.generateToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUsernameFromToken(token)).isEqualTo("user@example.com");
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(100L);
        assertThat(jwtTokenProvider.getRemainingExpiration(token)).isGreaterThan(0L);
    }

    @Test
    void validateToken_MalformedToken_ReturnsFalse() {
        assertThat(jwtTokenProvider.validateToken("invalid.token.here")).isFalse();
        assertThat(jwtTokenProvider.getRemainingExpiration("invalid.token.here")).isEqualTo(0L);
        assertThat(jwtTokenProvider.getUserIdFromToken("invalid.token.here")).isNull();
    }
}
