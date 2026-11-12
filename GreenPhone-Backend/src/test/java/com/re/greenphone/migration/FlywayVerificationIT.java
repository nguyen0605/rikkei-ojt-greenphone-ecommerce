package com.re.greenphone.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class FlywayVerificationIT {

    private static final String DB_USER = "root";
    private static final String DB_PASS = System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "12345678";
    private static final String BASE_URL = "jdbc:mysql://localhost:3306/";
    private static final String PARAMS = "?useSSL=false&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=UTF-8";

    @org.junit.jupiter.api.BeforeAll
    static void setupMigrationsDirectory() throws Exception {
        java.io.File targetDir = new java.io.File("build/test-migrations");
        if (targetDir.exists()) {
            for (java.io.File f : targetDir.listFiles()) f.delete();
        } else {
            targetDir.mkdirs();
        }

        java.io.File legacyDir = new java.io.File("build/test-migrations-legacy");
        if (legacyDir.exists()) {
            for (java.io.File f : legacyDir.listFiles()) f.delete();
        } else {
            legacyDir.mkdirs();
        }

        java.io.File srcDir = new java.io.File("src/main/resources/db/migration");
        if (srcDir.exists() && srcDir.isDirectory()) {
            for (java.io.File file : srcDir.listFiles()) {
                java.nio.file.Files.copy(file.toPath(), new java.io.File(targetDir, file.getName()).toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                // Legacy directory only contains pre-merge migrations (V1 to V18)
                String fn = file.getName();
                if (!fn.startsWith("V19__") && !fn.startsWith("V20__") && !fn.startsWith("V21__") && !fn.startsWith("V22__") && !fn.startsWith("V23__") && !fn.startsWith("V24__")) {
                    java.nio.file.Files.copy(file.toPath(), new java.io.File(legacyDir, file.getName()).toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
        // Legacy directory has task migrations as V20 and V21 for legacy database simulation
        java.io.File v23Src = new java.io.File("src/main/resources/db/migration/V23__add_danang_warehouse_and_distribute_stock.sql");
        if (v23Src.exists()) {
            java.nio.file.Files.copy(v23Src.toPath(), new java.io.File(legacyDir, "V20__add_danang_warehouse_and_distribute_stock.sql").toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        java.io.File v24Src = new java.io.File("src/main/resources/db/migration/V24__create_warehouse_transfer.sql");
        if (v24Src.exists()) {
            java.nio.file.Files.copy(v24Src.toPath(), new java.io.File(legacyDir, "V21__create_warehouse_transfer.sql").toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }

    @Test
    @Order(1)
    @DisplayName("1. Kiểm chứng Migration trên Database Mới Hoàn Toàn (V1 -> V19 -> V20 -> V21 -> V22 -> V23 -> V24)")
    void testFreshDatabaseMigration() throws Exception {
        String dbName = "greenphone_test_migration_v24";
        String jdbcUrl = BASE_URL + dbName + PARAMS;

        // Đảm bảo database sạch
        try (Connection rootConn = DriverManager.getConnection(BASE_URL + "mysql" + PARAMS, DB_USER, DB_PASS);
             Statement stmt = rootConn.createStatement()) {
            stmt.execute("DROP DATABASE IF EXISTS " + dbName);
            stmt.execute("CREATE DATABASE " + dbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }

        // Cấu hình Flyway nghiêm ngặt (Strict Configuration)
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, DB_USER, DB_PASS)
                .locations("filesystem:build/test-migrations")
                .baselineOnMigrate(false) // Bắt buộc chạy từ migration đầu tiên, không dùng baseline bypass
                .validateOnMigrate(true)  // Kiểm tra nghiêm ngặt checksum và thứ tự
                .cleanDisabled(true)      // Không cho phép clean vô tình
                .load();

        // 1. Thực thi Migrate
        MigrateResult result = flyway.migrate();
        assertTrue(result.success, "Flyway migrate phải thành công");
        assertTrue(result.migrationsExecuted >= 24, "Phải thực thi đủ các file migration (>= 24)");

        // 2. Validate nghiêm ngặt sau khi migrate
        assertDoesNotThrow(() -> flyway.validate(), "Flyway validate phải thành công 100% không có lỗi checksum");

        // 3. Kiểm tra dữ liệu và cấu trúc chi tiết
        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {

            // Kiểm tra các bảng nghiệp vụ mới từ develop:
            // V19: notification table
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES LIKE 'notification'")) {
                assertTrue(rs.next(), "Bảng notification (V19 develop) phải tồn tại");
            }

            // V20 develop: supplier.tax_code column
            try (ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM supplier LIKE 'tax_code'")) {
                assertTrue(rs.next(), "Cột supplier.tax_code (V20 develop) phải tồn tại");
            }

            // V21 develop: return_request.proof_images_json LONGTEXT
            try (ResultSet rs = stmt.executeQuery("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '" + dbName + "' AND TABLE_NAME = 'return_request' AND COLUMN_NAME = 'proof_images_json'")) {
                assertTrue(rs.next());
                assertEquals("longtext", rs.getString("DATA_TYPE").toLowerCase(), "Cột proof_images_json phải là longtext");
            }

            // V22 develop: oppo a78 variants
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM phone_variant WHERE sku LIKE '%OPPO-A78%'")) {
                assertTrue(rs.next());
                assertTrue(rs.getInt(1) >= 1, "Biến thể Oppo A78 (V22 develop) phải tồn tại");
            }

            // V23 task: 3 kho đầy đủ tọa độ và kho Đà Nẵng
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM warehouse WHERE code = 'WH-DN-HAI' AND latitude IS NOT NULL AND longitude IS NOT NULL")) {
                assertTrue(rs.next());
                assertEquals(1, rs.getInt(1), "Kho WH-DN-HAI phải có mặt và đầy đủ tọa độ");
            }

            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM warehouse WHERE status = 'ACTIVE'")) {
                assertTrue(rs.next());
                assertTrue(rs.getInt(1) >= 3, "Phải có ít nhất 3 chi nhánh kho ACTIVE");
            }

            // V24 task: warehouse_transfer & warehouse_transfer_item tables
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES LIKE 'warehouse_transfer'")) {
                assertTrue(rs.next(), "Bảng warehouse_transfer (V24 task) phải tồn tại");
            }

            try (ResultSet rs = stmt.executeQuery("SHOW TABLES LIKE 'warehouse_transfer_item'")) {
                assertTrue(rs.next(), "Bảng warehouse_transfer_item (V24 task) phải tồn tại");
            }

            // Kiểm tra cột reserved_quantity trong warehouse_stock
            try (ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM warehouse_stock LIKE 'reserved_quantity'")) {
                assertTrue(rs.next(), "Cột reserved_quantity phải tồn tại trong warehouse_stock");
            }

            // Kiểm tra cột fulfillment_warehouse_id trong orders
            try (ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM orders LIKE 'fulfillment_warehouse_id'")) {
                assertTrue(rs.next(), "Cột fulfillment_warehouse_id phải tồn tại trong orders");
            }

            // Kiểm tra cột warehouse_id trong users
            try (ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM users LIKE 'warehouse_id'")) {
                assertTrue(rs.next(), "Cột warehouse_id phải tồn tại trong users");
            }

            // Kiểm tra Foreign Keys
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = '" + dbName + "' AND TABLE_NAME = 'warehouse_transfer' AND CONSTRAINT_TYPE = 'FOREIGN KEY'")) {
                List<String> fkList = new ArrayList<>();
                while (rs.next()) {
                    fkList.add(rs.getString("CONSTRAINT_NAME"));
                }
                assertTrue(fkList.contains("fk_wt_order"), "Foreign key fk_wt_order phải tồn tại");
                assertTrue(fkList.contains("fk_wt_source"), "Foreign key fk_wt_source phải tồn tại");
                assertTrue(fkList.contains("fk_wt_destination"), "Foreign key fk_wt_destination phải tồn tại");
            }
        }
    }

    @Test
    @Order(2)
    @DisplayName("2. Kiểm chứng Phương Án Chuyển Đổi An Toàn cho Database Đã Áp Dụng V20/V21 Cũ")
    void testExistingDatabaseTransition() throws Exception {
        String dbName = "greenphone_test_migration_existing";
        String jdbcUrl = BASE_URL + dbName + PARAMS;

        // Tạo DB mô phỏng môi trường hiện tại của dev
        try (Connection rootConn = DriverManager.getConnection(BASE_URL + "mysql" + PARAMS, DB_USER, DB_PASS);
             Statement stmt = rootConn.createStatement()) {
            stmt.execute("DROP DATABASE IF EXISTS " + dbName);
            stmt.execute("CREATE DATABASE " + dbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }

        // Bước 1: Mô phỏng DB đã chạy các migration cũ của nhánh task:
        // V1 -> V18, và V20 (Danang cũ), V21 (Warehouse transfer cũ)
        Flyway initialFlyway = Flyway.configure()
                .dataSource(jdbcUrl, DB_USER, DB_PASS)
                .locations("filesystem:build/test-migrations-legacy")
                .baselineOnMigrate(false)
                .load();
        initialFlyway.migrate();

        // Bước 2: Kiểm tra DB đang ở version 21 của task (chưa có V19, V20 của develop)
        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SELECT max(CAST(version AS SIGNED)) FROM flyway_schema_history")) {
                assertTrue(rs.next());
                assertEquals(21, rs.getInt(1), "Database hiện tại đang ở version 21");
            }
        }

        // Bước 3: Áp dụng kịch bản chuyển đổi an toàn (Safe Transition Script):
        // Cập nhật version trong flyway_schema_history từ 20 -> 23 và 21 -> 24
        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("UPDATE flyway_schema_history SET version = '23', description = 'add danang warehouse and distribute stock', script = 'V23__add_danang_warehouse_and_distribute_stock.sql' WHERE version = '20' AND script LIKE '%danang%';");
            stmt.executeUpdate("UPDATE flyway_schema_history SET version = '24', description = 'create warehouse transfer', script = 'V24__create_warehouse_transfer.sql' WHERE version = '21' AND script LIKE '%warehouse_transfer%';");
        }

        // Bước 4: Chạy Flyway migrate với thư mục migrations đã hợp nhất (gồm V19, V20 develop, V21 develop, V22 develop, V23 task, V24 task)
        // Với outOfOrder = true (đã có sẵn trong application.yml của dự án)
        Flyway upgradedFlyway = Flyway.configure()
                .dataSource(jdbcUrl, DB_USER, DB_PASS)
                .locations("filesystem:build/test-migrations")
                .outOfOrder(true)
                .validateOnMigrate(false)
                .load();

        MigrateResult upgradeResult = upgradedFlyway.migrate();
        assertTrue(upgradeResult.success, "Quá trình migrate bù V19, V20, V21, V22 phải thành công");
        assertEquals(4, upgradeResult.migrationsExecuted, "Phải chạy đúng 4 migration còn thiếu từ develop (V19, V20, V21, V22)");

        // Bước 5: Xác minh cấu trúc sau khi chuyển đổi hoàn chỉnh
        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES LIKE 'notification'")) {
                assertTrue(rs.next(), "Bảng notification (V19 bù) phải tồn tại");
            }
            try (ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM supplier LIKE 'tax_code'")) {
                assertTrue(rs.next(), "Cột supplier.tax_code (V20 bù) phải tồn tại");
            }
            try (ResultSet rs = stmt.executeQuery("SHOW TABLES LIKE 'warehouse_transfer'")) {
                assertTrue(rs.next(), "Bảng warehouse_transfer vẫn nguyên vẹn");
            }
        }
    }
}
