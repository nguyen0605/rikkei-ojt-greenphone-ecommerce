package com.re.greenphone.config;

import com.re.greenphone.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final CorsConfigurationSource corsConfigurationSource;

        private static final String[] PUBLIC_PATHS = {
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/verify-otp",
                        "/api/auth/resend-otp",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password",
                        "/api/auth/refresh",
                        "/api/auth/logout",
                        "/api/phones/**",
                        "/api/brands/**",
                        "/api/banners/**",
                        "/api/reviews/phone/**",
                        "/api/webhooks/**",
                        "/api/promotions/public/**",
                        "/api/settings/**",
                        "/api/options/**",
                        "/api/shipments/track/**",
                        "/api/v1/shipments/track/**",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/actuator/health/**"
        };

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
                return authConfig.getAuthenticationManager();
        }

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                var warehouseMatcher = org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
                                .withDefaults().matcher("/api/v1/admin/**");
                var errorMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                // Public endpoints
                                                .requestMatchers(PUBLIC_PATHS).permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/phones/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/brands/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/banners/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/reviews/phone/**").permitAll()
                                                // Admin endpoints
                                                .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                                                // All other API endpoints require authentication
                                                .requestMatchers("/api/**", "/api/v1/**").authenticated()
                                                .anyRequest().permitAll())
                                .exceptionHandling(errors -> errors
                                                .defaultAuthenticationEntryPointFor((request, response, exception) -> {
                                                        response.setStatus(401);
                                                        response.setContentType("application/json");
                                                        errorMapper.writeValue(response.getOutputStream(),
                                                                com.re.greenphone.common.dto.ApiResponse.error(401, "Authentication required"));
                                                }, warehouseMatcher)
                                                .defaultAccessDeniedHandlerFor((request, response, exception) -> {
                                                        response.setStatus(403);
                                                        response.setContentType("application/json");
                                                        errorMapper.writeValue(response.getOutputStream(),
                                                                com.re.greenphone.common.dto.ApiResponse.error(403, "Access denied"));
                                                }, warehouseMatcher))
                                .addFilterBefore(jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}
