package com.re.greenphone.service.admin;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class WarehouseStockMigrationIT {
    @Container static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("warehouse_stock_migration").withUsername("test").withPassword("test")
            .withUrlParam("characterEncoding", "UTF-8");

    @Test
    void backfillAssignsExistingTotalsOnlyToHanoiAndPinsHistoricalOrderWarehouse() throws Exception {
        var configuration = Flyway.configure().dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration");
        configuration.target("7").load().migrate();
        configuration.target("8").load().migrate();
        try (var connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
             var statement = connection.createStatement()) {
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM phone_variant v LEFT JOIN warehouse_stock s ON s.phone_variant_id=v.id LEFT JOIN warehouse w ON w.id=s.warehouse_id WHERE s.id IS NULL OR s.quantity<>v.stock_quantity OR w.code<>'WH-HN-MAIN'")) {
                result.next(); assertThat(result.getInt(1)).isZero();
            }
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM warehouse_stock s JOIN warehouse w ON w.id=s.warehouse_id WHERE w.code<>'WH-HN-MAIN'")) {
                result.next(); assertThat(result.getInt(1)).isZero();
            }
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM order_detail d LEFT JOIN warehouse w ON w.id=d.warehouse_id WHERE w.id IS NULL OR w.code<>'WH-HN-MAIN'")) {
                result.next(); assertThat(result.getInt(1)).isZero();
            }
            assertThatThrownBy(() -> statement.executeUpdate("UPDATE warehouse_stock SET quantity=-1 LIMIT 1"))
                    .isInstanceOf(java.sql.SQLException.class);
        }
    }
}
