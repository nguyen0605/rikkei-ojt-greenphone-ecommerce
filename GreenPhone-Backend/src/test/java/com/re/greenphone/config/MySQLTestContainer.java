package com.re.greenphone.config;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public abstract class MySQLTestContainer {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("greenphone_test")
            .withUsername("test")
            .withPassword("test")
            .withUrlParam("characterEncoding", "utf8mb4")
            .withUrlParam("useUnicode", "true")
            .withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.jpa.properties.hibernate.format_sql", () -> "false");
        // Disable external services for tests
        registry.add("CLOUDINARY_CLOUD_NAME", () -> "test");
        registry.add("CLOUDINARY_API_KEY", () -> "test");
        registry.add("CLOUDINARY_API_SECRET", () -> "test");
        registry.add("SEPAY_ACCOUNT_NUMBER", () -> "test");
        registry.add("SEPAY_BANK_CODE", () -> "VCB");
        registry.add("SEPAY_ACCOUNT_HOLDER", () -> "test");
        registry.add("SEPAY_STORE_NAME", () -> "test");
        registry.add("SEPAY_API_TOKEN", () -> "test");
        registry.add("SEPAY_WEBHOOK_SECRET", () -> "test");
        registry.add("MAIL_HOST", () -> "localhost");
        registry.add("MAIL_PORT", () -> "3025");
        registry.add("MAIL_USERNAME", () -> "test");
        registry.add("MAIL_PASSWORD", () -> "test");
        registry.add("JWT_SECRET", () -> "test-secret-key-for-integration-tests-12345678901234567890");
        registry.add("JWT_EXPIRATION", () -> "3600000");
    }
}
