package com.re.greenphone.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Cau hinh tu dong chay Flyway migration khi khoi dong Backend.
 * Giup cac thanh vien trong doi ngu chi can pull code ve va chay BE
 * la co so du lieu tu dong duoc khoi tao va cap nhat day du cac migration moi nhat.
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Value("${spring.flyway.enabled:true}")
    private boolean flywayEnabled;

    @Bean
    public Flyway flyway(DataSource dataSource) {
        if (!flywayEnabled) {
            log.info("Flyway migration bi vo hieu hoa theo cau hinh (spring.flyway.enabled=false).");
            return Flyway.configure().dataSource(dataSource).load();
        }

        log.info("Bat dau kiem tra va tu dong khoi chay Flyway migration...");

        try {
            // 1. Tu dong dong bo schema history cho database da co san du lieu tu truoc
            try (Connection conn = dataSource.getConnection()) {
                syncExistingSchemaHistoryIfEmpty(conn);
            } catch (Exception ex) {
                log.warn("Kiem tra dong bo schema history: {}", ex.getMessage());
            }

            // 2. Khoi tao doi tuong Flyway
            Flyway flyway = Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .outOfOrder(true)
                    .validateOnMigrate(false)
                    .load();

            // 3. Tu dong sua chua checksum hoac trang thai loi (neu khac biet CRLF/LF giua cac he dieu hanh)
            try {
                flyway.repair();
            } catch (Exception ex) {
                log.warn("Flyway repair: {}", ex.getMessage());
            }

            // 4. Thuc thi toan bo migration con thieu
            int migratedCount = flyway.migrate().migrationsExecuted;
            log.info("Flyway migration hoan tat thanh cong! So ban migration da thuc thi: {}", migratedCount);

            return flyway;
        } catch (Exception e) {
            log.error("Loi khi tu dong chay Flyway migration: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Ho tro dac biet cho thanh vien trong doi ngu:
     * Neu database da co cac bang tu truoc (vi du da import dump V1, V2 hay chay thu cong),
     * nhung bang flyway_schema_history chua ton tai, phuong thuc nay se tu dong khoi tao
     * flyway_schema_history va ghi nhan chinh xac cac version da ton tai de tranh loi
     * "Table already exists" khi chay migrate.
     */
    private void syncExistingSchemaHistoryIfEmpty(Connection conn) {
        try (Statement stmt = conn.createStatement()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String catalog = conn.getCatalog();

            boolean flywayHistoryExists = false;
            try (ResultSet rs = metaData.getTables(catalog, null, "flyway_schema_history", null)) {
                if (rs.next()) {
                    flywayHistoryExists = true;
                }
            }

            if (flywayHistoryExists) {
                return;
            }

            boolean hasExistingTables = false;
            try (ResultSet rs = metaData.getTables(catalog, null, "banner", null)) {
                if (rs.next()) {
                    hasExistingTables = true;
                }
            }

            if (!hasExistingTables) {
                log.info("Database hoan toan moi. Flyway se tu dong khoi tao toan bo tu V1 tro di.");
                return;
            }

            log.info("Phat hien database da co san du lieu nhung chua co flyway_schema_history. Dang tu dong dong bo baseline...");

            stmt.execute(
                "CREATE TABLE IF NOT EXISTS `flyway_schema_history` (" +
                "  `installed_rank` INT NOT NULL," +
                "  `version` VARCHAR(50) DEFAULT NULL," +
                "  `description` VARCHAR(200) NOT NULL," +
                "  `type` VARCHAR(20) NOT NULL," +
                "  `script` VARCHAR(1000) NOT NULL," +
                "  `checksum` INT DEFAULT NULL," +
                "  `installed_by` VARCHAR(100) NOT NULL," +
                "  `installed_on` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                "  `execution_time` INT NOT NULL," +
                "  `success` TINYINT(1) NOT NULL," +
                "  PRIMARY KEY (`installed_rank`)," +
                "  KEY `flyway_schema_history_s_idx` (`success`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );

            int rank = 1;

            // V1: init schema
            stmt.execute(
                String.format(
                    "INSERT IGNORE INTO `flyway_schema_history` " +
                    "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                    "VALUES (%d, '1', 'init greenphone schema', 'SQL', 'V1__init_greenphone_schema.sql', NULL, 'AUTO_SYNC', 1, 1)",
                    rank++
                )
            );

            // V2: seed data
            stmt.execute(
                String.format(
                    "INSERT IGNORE INTO `flyway_schema_history` " +
                    "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                    "VALUES (%d, '2', 'seed greenphone data', 'SQL', 'V2__seed_greenphone_data.sql', NULL, 'AUTO_SYNC', 1, 1)",
                    rank++
                )
            );

            // V3: inventory_stock_history
            if (tableExists(metaData, catalog, "inventory_stock_history")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '3', 'create inventory stock history', 'SQL', 'V3__create_inventory_stock_history.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V4: sort_order in banner
            if (columnExists(metaData, catalog, "banner", "sort_order")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '4', 'add sort order and position to banner', 'SQL', 'V4__add_sort_order_and_position_to_banner.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V4.1: phone variants imported
            if (hasPhoneVariantImported(stmt)) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '4.1', 'import 50 phones with r2 images', 'SQL', 'V4.1__import_50_phones_with_r2_images.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V5: warehouse
            if (tableExists(metaData, catalog, "warehouse")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '5', 'enhance inventory and stock reservation', 'SQL', 'V5__enhance_inventory_and_stock_reservation.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V6: supplier
            if (tableExists(metaData, catalog, "supplier")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '6', 'create suppliers and purchase orders', 'SQL', 'V6__create_suppliers_and_purchase_orders.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V7: warranty
            if (tableExists(metaData, catalog, "warranty")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '7', 'create warranties and units', 'SQL', 'V7__create_warranties_and_units.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V8: shipment
            if (tableExists(metaData, catalog, "shipment")) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '8', 'create shipments', 'SQL', 'V8__create_shipments.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            // V8.1: mock category data / brand logos
            if (hasBrandLogoUrl(stmt)) {
                stmt.execute(
                    String.format(
                        "INSERT IGNORE INTO `flyway_schema_history` " +
                        "(`installed_rank`, `version`, `description`, `type`, `script`, `checksum`, `installed_by`, `execution_time`, `success`) " +
                        "VALUES (%d, '8.1', 'mock category data', 'SQL', 'V8.1__mock_category_data.sql', NULL, 'AUTO_SYNC', 1, 1)",
                        rank++
                    )
                );
            }

            log.info("Dong bo flyway_schema_history thanh cong. San sang thuc thi migrate tiep theo.");
        } catch (Exception ex) {
            log.warn("Khong the tu dong dong bo flyway_schema_history: {}. Tiep tuc de Flyway xu ly.", ex.getMessage());
        }
    }

    private boolean tableExists(DatabaseMetaData metaData, String catalog, String tableName) {
        try (ResultSet rs = metaData.getTables(catalog, null, tableName, null)) {
            return rs.next();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean columnExists(DatabaseMetaData metaData, String catalog, String tableName, String columnName) {
        try (ResultSet rs = metaData.getColumns(catalog, null, tableName, columnName)) {
            return rs.next();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasPhoneVariantImported(Statement stmt) {
        try (ResultSet rs = stmt.executeQuery("SELECT 1 FROM `phone` WHERE `id` >= 100 LIMIT 1")) {
            return rs.next();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasBrandLogoUrl(Statement stmt) {
        try (ResultSet rs = stmt.executeQuery("SELECT 1 FROM `brand` WHERE `name` = 'Google Pixel' AND `logo_url` IS NOT NULL LIMIT 1")) {
            return rs.next();
        } catch (Exception e) {
            return false;
        }
    }
}
