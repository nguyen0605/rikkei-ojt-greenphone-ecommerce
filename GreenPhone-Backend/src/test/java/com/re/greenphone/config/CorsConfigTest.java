package com.re.greenphone.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    @DisplayName("CORS config should parse dynamic allowed origins from environment property")
    void corsConfigurationSource_ShouldParseDynamicOrigins() {
        CorsConfig corsConfig = new CorsConfig();
        ReflectionTestUtils.setField(corsConfig, "allowedOrigins", "https://greenphone.vn, https://admin.greenphone.vn , http://localhost:5173");

        CorsConfigurationSource source = corsConfig.corsConfigurationSource();
        assertThat(source).isInstanceOf(UrlBasedCorsConfigurationSource.class);

        UrlBasedCorsConfigurationSource urlSource = (UrlBasedCorsConfigurationSource) source;
        CorsConfiguration config = urlSource.getCorsConfigurations().get("/**");

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOriginPatterns()).containsExactlyInAnyOrder(
                "https://greenphone.vn",
                "https://admin.greenphone.vn",
                "http://localhost:5173"
        );
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getAllowedMethods()).contains("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS");
        assertThat(config.getAllowedHeaders()).contains("*");
    }

    @Test
    @DisplayName("CORS config should handle single origin gracefully")
    void corsConfigurationSource_ShouldHandleSingleOrigin() {
        CorsConfig corsConfig = new CorsConfig();
        ReflectionTestUtils.setField(corsConfig, "allowedOrigins", "https://greenphone.vn");

        CorsConfigurationSource source = corsConfig.corsConfigurationSource();
        UrlBasedCorsConfigurationSource urlSource = (UrlBasedCorsConfigurationSource) source;
        CorsConfiguration config = urlSource.getCorsConfigurations().get("/**");

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOriginPatterns()).containsExactly("https://greenphone.vn");
    }
}
