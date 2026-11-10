package com.re.greenphone.service.admin;

import com.re.greenphone.entity.Warehouse;
import org.flywaydb.core.Flyway;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.*;

/** Uses real migrations on an isolated database, never the developer's local volume. */
@Testcontainers
class WarehouseMigrationIT {
    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("warehouse_migration_test").withUsername("test").withPassword("test")
            .withUrlParam("characterEncoding", "UTF-8");

    @BeforeAll
    static void migrateThroughV5() {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration").target("5").load().migrate();
    }

    @Test
    void entityReadsBothSeededWarehousesWithSchemaValidation() {
        Configuration configuration = new Configuration().addAnnotatedClass(Warehouse.class);
        configuration.setProperty("hibernate.connection.url", MYSQL.getJdbcUrl());
        configuration.setProperty("hibernate.connection.username", MYSQL.getUsername());
        configuration.setProperty("hibernate.connection.password", MYSQL.getPassword());
        configuration.setProperty("hibernate.hbm2ddl.auto", "validate");
        try (SessionFactory factory = configuration.buildSessionFactory(); var session = factory.openSession()) {
            var warehouses = session.createSelectionQuery("from Warehouse order by id", Warehouse.class).getResultList();
            assertThat(warehouses).extracting(Warehouse::getCode).containsExactly("WH-HN-MAIN", "WH-HCM-Q1");
            assertThat(warehouses).allSatisfy(warehouse -> {
                assertThat(warehouse.getCreatedAt()).isNotNull();
                assertThat(warehouse.getStatus()).isEqualTo("ACTIVE");
                assertThat(warehouse.getAddress()).isNotBlank();
            });
        }
    }

    @Test
    void databaseRejectsDuplicateCodeEvenWithoutServicePrecheck() throws Exception {
        try (var connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
             var statement = connection.prepareStatement("INSERT INTO warehouse(code, name, address) VALUES (?, ?, ?)")) {
            statement.setString(1, "WH-HN-MAIN");
            statement.setString(2, "Duplicate");
            statement.setString(3, "Address");
            assertThatThrownBy(statement::executeUpdate).isInstanceOfSatisfying(SQLException.class,
                    ex -> {
                        assertThat(ex.getErrorCode()).isEqualTo(1062);
                        assertThat(ex.getMessage()).contains("uq_warehouse_code");
                    });
        }
    }
}
