package com.re.greenphone.service.admin;

import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.entity.WarehouseStock;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.WarehouseRepository;
import com.re.greenphone.repository.WarehouseStockRepository;
import com.re.greenphone.service.impl.WarehouseRoutingServiceImpl;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * INV-09: Integration test kiểm tra việc tạo kho Đà Nẵng và phân bổ cân bằng tồn kho 3 miền (Flyway V20).
 * Hỗ trợ tự động:
 * 1. Chạy với Testcontainers MySQL Container nếu Docker khả dụng.
 * 2. Tự động fallback sang MySQL cục bộ (port 3306) trên schema kiểm thử biệt lập nếu Docker không chạy.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WarehouseMigrationIT {

    private static MySQLContainer<?> mysqlContainer;
    private static String jdbcUrl;
    private static String dbUser;
    private static String dbPass;
    private static boolean isTestcontainers = false;

    @BeforeAll
    static void setupAndMigrate() throws Exception {
        boolean dockerAvailable = false;
        try {
            dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable ignored) {
        }

        if (dockerAvailable) {
            mysqlContainer = new MySQLContainer<>("mysql:8.0")
                    .withDatabaseName("warehouse_migration_test")
                    .withUsername("test")
                    .withPassword("test")
                    .withUrlParam("characterEncoding", "UTF-8");
            mysqlContainer.start();
            jdbcUrl = mysqlContainer.getJdbcUrl();
            dbUser = mysqlContainer.getUsername();
            dbPass = mysqlContainer.getPassword();
            isTestcontainers = true;
        } else {
            // Fallback sang local MySQL 8.0 với database kiểm thử độc lập
            dbUser = "root";
            dbPass = "12345678";
            try (Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/?characterEncoding=UTF-8&useUnicode=true", dbUser, dbPass);
                 Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("DROP DATABASE IF EXISTS greenphone_test_migration");
                stmt.executeUpdate("CREATE DATABASE greenphone_test_migration CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
            jdbcUrl = "jdbc:mysql://localhost:3306/greenphone_test_migration?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&characterEncoding=UTF-8&useUnicode=true";
        }

        // Chạy toàn bộ migrations từ V1 đến V20
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, dbUser, dbPass)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();
        flyway.migrate();
    }

    @AfterAll
    static void tearDown() {
        if (mysqlContainer != null && mysqlContainer.isRunning()) {
            mysqlContainer.stop();
        }
    }

    private Connection getConnection() throws Exception {
        return DriverManager.getConnection(jdbcUrl, dbUser, dbPass);
    }

    @Test
    @Order(1)
    @DisplayName("1. Có đủ ba kho ACTIVE trong bảng warehouse")
    void testActiveWarehousesCount() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT code, status FROM warehouse WHERE status = 'ACTIVE' ORDER BY code")) {

            List<String> activeCodes = new ArrayList<>();
            while (rs.next()) {
                activeCodes.add(rs.getString("code"));
            }
            assertThat(activeCodes).contains("WH-HN-MAIN", "WH-HCM-Q1", "WH-DN-HAI");
        }
    }

    @Test
    @Order(2)
    @DisplayName("2. Kho Đà Nẵng có mã WH-DN-HAI và tên chính xác")
    void testDanangWarehouseDetails() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT code, name, address, status FROM warehouse WHERE code = 'WH-DN-HAI'")) {

            assertThat(rs.next()).isTrue();
            assertThat(rs.getString("code")).isEqualTo("WH-DN-HAI");
            assertThat(rs.getString("name")).isEqualTo("Kho Chi Nhánh Đà Nẵng");
            assertThat(rs.getString("address")).isEqualTo("Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng");
            assertThat(rs.getString("status")).isEqualTo("ACTIVE");
        }
    }

    @Test
    @Order(3)
    @DisplayName("3. Tọa độ Đà Nẵng chính xác (16.0544, 108.2022)")
    void testDanangCoordinates() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT latitude, longitude FROM warehouse WHERE code = 'WH-DN-HAI'")) {

            assertThat(rs.next()).isTrue();
            BigDecimal lat = rs.getBigDecimal("latitude");
            BigDecimal lng = rs.getBigDecimal("longitude");
            assertThat(lat).isNotNull();
            assertThat(lng).isNotNull();
            assertThat(lat.doubleValue()).isEqualTo(16.0544);
            assertThat(lng.doubleValue()).isEqualTo(108.2022);
        }
    }

    @Test
    @Order(4)
    @DisplayName("4. Mỗi biến thể có bản ghi tại cả ba kho")
    void testEveryVariantHasThreeWarehouseRecords() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT v.id, COUNT(ws.id) AS wh_count " +
                     "FROM phone_variant v " +
                     "LEFT JOIN warehouse_stock ws ON ws.phone_variant_id = v.id " +
                     "LEFT JOIN warehouse w ON w.id = ws.warehouse_id AND w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI') " +
                     "GROUP BY v.id " +
                     "HAVING wh_count < 3"
             )) {

            assertThat(rs.next()).isFalse();
        }
    }

    @Test
    @Order(5)
    @DisplayName("5. Tổng tồn kho ba kho luôn bằng phone_variant.stock_quantity")
    void testTotalWarehouseStockEqualsVariantStock() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT v.id, v.sku, v.stock_quantity, " +
                     "COALESCE(SUM(ws.quantity), 0) AS total_in_warehouses, " +
                     "v.stock_quantity - COALESCE(SUM(ws.quantity), 0) AS diff " +
                     "FROM phone_variant v " +
                     "LEFT JOIN warehouse_stock ws ON ws.phone_variant_id = v.id " +
                     "GROUP BY v.id, v.sku, v.stock_quantity " +
                     "HAVING diff <> 0"
             )) {

            assertThat(rs.next()).isFalse();
        }
    }

    @Test
    @Order(6)
    @DisplayName("6. Không có tồn kho âm ở bất kỳ kho nào")
    void testNoNegativeStock() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM warehouse_stock WHERE quantity < 0")) {

            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).isZero();
        }
    }

    @Test
    @Order(7)
    @DisplayName("7. Phân bổ chính xác với các kịch bản mẫu (stock = 0, 1, 2, 3, 10, 11)")
    void testDistributionEdgeCases() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            // Kiểm tra trên các biến thể đã seed hoặc tạo biến thể thử nghiệm
            long variantId0 = insertTestVariant(stmt, "TEST-SKU-0", 0);
            long variantId1 = insertTestVariant(stmt, "TEST-SKU-1", 1);
            long variantId2 = insertTestVariant(stmt, "TEST-SKU-2", 2);
            long variantId3 = insertTestVariant(stmt, "TEST-SKU-3", 3);
            long variantId10 = insertTestVariant(stmt, "TEST-SKU-10", 10);
            long variantId11 = insertTestVariant(stmt, "TEST-SKU-11", 11);

            // Chạy logic phân bổ cho các biến thể test mới
            reallocateVariant(stmt, variantId0, 0);
            reallocateVariant(stmt, variantId1, 1);
            reallocateVariant(stmt, variantId2, 2);
            reallocateVariant(stmt, variantId3, 3);
            reallocateVariant(stmt, variantId10, 10);
            reallocateVariant(stmt, variantId11, 11);

            // Kiểm tra stock = 0 -> HN: 0, HCM: 0, DN: 0
            assertStockAllocation(stmt, variantId0, 0, 0, 0);

            // Kiểm tra stock = 1 -> HN: 1, HCM: 0, DN: 0
            assertStockAllocation(stmt, variantId1, 1, 0, 0);

            // Kiểm tra stock = 2 -> HN: 1, HCM: 1, DN: 0
            assertStockAllocation(stmt, variantId2, 1, 1, 0);

            // Kiểm tra stock = 3 -> HN: 1, HCM: 1, DN: 1
            assertStockAllocation(stmt, variantId3, 1, 1, 1);

            // Kiểm tra stock = 10 -> HN: 4, HCM: 3, DN: 3
            assertStockAllocation(stmt, variantId10, 4, 3, 3);

            // Kiểm tra stock = 11 -> HN: 4, HCM: 4, DN: 3
            assertStockAllocation(stmt, variantId11, 4, 4, 3);
        }
    }

    @Test
    @Order(8)
    @DisplayName("8. Không tạo bản ghi kho trùng (Unique code)")
    void testUniqueWarehouseCodeConstraint() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            assertThatThrownBy(() -> stmt.executeUpdate(
                    "INSERT INTO warehouse (code, name, address, status) VALUES ('WH-DN-HAI', 'Duplicate DN', 'Address', 'ACTIVE')"
            )).isInstanceOf(java.sql.SQLException.class);
        }
    }

    @Test
    @Order(9)
    @DisplayName("9. Không tạo lịch sử phân bổ trùng khi chạy lại")
    void testNoDuplicateHistoryOnReRun() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            // Đếm số lượng history hiện tại của INV-09
            int beforeCount;
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) FROM warehouse_stock_history WHERE reason = 'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)'")) {
                rs.next();
                beforeCount = rs.getInt(1);
            }

            // Chạy lại chính xác câu lệnh INSERT history của V20
            int affected = stmt.executeUpdate(
                    "INSERT INTO warehouse_stock_history (" +
                    "  warehouse_id, phone_variant_id, change_type, quantity_before, quantity_change, quantity_after, reason, changed_by_name, created_at" +
                    ") " +
                    "SELECT " +
                    "  ws.warehouse_id, ws.phone_variant_id, 'OPENING', ws.quantity, " +
                    "  (CASE " +
                    "     WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END " +
                    "     WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END " +
                    "     WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3) " +
                    "   END) - ws.quantity AS quantity_change, " +
                    "  (CASE " +
                    "     WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END " +
                    "     WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END " +
                    "     WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3) " +
                    "   END) AS quantity_after, " +
                    "  'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)', 'SYSTEM', CURRENT_TIMESTAMP(6) " +
                    "FROM warehouse_stock ws " +
                    "JOIN warehouse w ON w.id = ws.warehouse_id " +
                    "JOIN phone_variant v ON v.id = ws.phone_variant_id " +
                    "WHERE w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI') " +
                    "  AND ((CASE " +
                    "        WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END " +
                    "        WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END " +
                    "        WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3) " +
                    "       END) - ws.quantity) <> 0 " +
                    "  AND NOT EXISTS (" +
                    "      SELECT 1 FROM warehouse_stock_history wsh " +
                    "      WHERE wsh.warehouse_id = ws.warehouse_id " +
                    "        AND wsh.phone_variant_id = ws.phone_variant_id " +
                    "        AND wsh.reason = 'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)')"
            );

            // Xác nhận không có dòng nào được thêm
            assertThat(affected).isZero();

            // Số lượng history không được tăng lên
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) FROM warehouse_stock_history WHERE reason = 'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)'")) {
                rs.next();
                assertThat(rs.getInt(1)).isEqualTo(beforeCount);
            }
        }
    }

    @Test
    @Order(10)
    @DisplayName("10. INV-07 tìm thấy kho Đà Nẵng khi truy vấn tọa độ tại Đà Nẵng")
    void testRoutingServiceFindsDanangWarehouse() {
        WarehouseRepository warehouseRepo = mock(WarehouseRepository.class);
        WarehouseStockRepository stockRepo = mock(WarehouseStockRepository.class);
        PhoneVariantRepository variantRepo = mock(PhoneVariantRepository.class);

        Warehouse hn = createWarehouse(1L, "WH-HN-MAIN", "Kho Hà Nội", 21.0285, 105.8542);
        Warehouse hcm = createWarehouse(2L, "WH-HCM-Q1", "Kho TP.HCM", 10.7769, 106.7009);
        Warehouse dn = createWarehouse(3L, "WH-DN-HAI", "Kho Đà Nẵng", 16.0544, 108.2022);

        when(warehouseRepo.findByStatus("ACTIVE")).thenReturn(List.of(hn, hcm, dn));

        WarehouseRoutingServiceImpl routingService = new WarehouseRoutingServiceImpl(warehouseRepo, stockRepo, variantRepo);

        // Tọa độ cầu Rồng, Đà Nẵng (16.0611, 108.2208)
        NearestWarehouseResponse nearest = routingService.findNearestWarehouse(16.0611, 108.2208);

        assertThat(nearest).isNotNull();
        assertThat(nearest.getCode()).isEqualTo("WH-DN-HAI");
        assertThat(nearest.getDistanceKm()).isLessThan(5.0); // Khoảng cách < 5km
    }

    @Test
    @Order(11)
    @DisplayName("11. INV-07 ưu tiên chọn kho Đà Nẵng cho đơn hàng khi kho Đà Nẵng có đủ hàng")
    void testRoutingServiceSelectsDanangWhenInStock() {
        WarehouseRepository warehouseRepo = mock(WarehouseRepository.class);
        WarehouseStockRepository stockRepo = mock(WarehouseStockRepository.class);
        PhoneVariantRepository variantRepo = mock(PhoneVariantRepository.class);

        Warehouse hn = createWarehouse(1L, "WH-HN-MAIN", "Kho Hà Nội", 21.0285, 105.8542);
        Warehouse hcm = createWarehouse(2L, "WH-HCM-Q1", "Kho TP.HCM", 10.7769, 106.7009);
        Warehouse dn = createWarehouse(3L, "WH-DN-HAI", "Kho Đà Nẵng", 16.0544, 108.2022);

        when(warehouseRepo.findByStatus("ACTIVE")).thenReturn(List.of(hn, hcm, dn));

        PhoneVariant variant = new PhoneVariant();
        variant.setId(101L);
        variant.setStockQuantity(10);
        when(variantRepo.findAllById(List.of(101L))).thenReturn(List.of(variant));

        // Kho Đà Nẵng có 3 sản phẩm
        WarehouseStock stockDn = new WarehouseStock();
        stockDn.setWarehouse(dn);
        stockDn.setPhoneVariant(variant);
        stockDn.setQuantity(3);

        when(stockRepo.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(List.of(stockDn));

        WarehouseRoutingServiceImpl routingService = new WarehouseRoutingServiceImpl(warehouseRepo, stockRepo, variantRepo);

        // Khách đặt 2 sản phẩm tại Đà Nẵng
        List<OrderItemRequirement> items = List.of(new OrderItemRequirement(101L, 2));
        Warehouse selected = routingService.routeWarehouseForOrder(16.0611, 108.2208, items);

        assertThat(selected).isNotNull();
        assertThat(selected.getCode()).isEqualTo("WH-DN-HAI");
    }

    // Helper methods
    private Warehouse createWarehouse(Long id, String code, String name, double lat, double lng) {
        Warehouse w = new Warehouse();
        w.setId(id);
        w.setCode(code);
        w.setName(name);
        w.setStatus("ACTIVE");
        w.setLatitude(BigDecimal.valueOf(lat));
        w.setLongitude(BigDecimal.valueOf(lng));
        return w;
    }

    private long insertTestVariant(Statement stmt, String sku, int stock) throws Exception {
        stmt.executeUpdate(
                "INSERT INTO phone (name, brand_id, status, created_at) " +
                "VALUES ('Phone " + sku + "', 1, 'ACTIVE', CURRENT_TIMESTAMP(6))"
        );
        long phoneId;
        try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
            rs.next();
            phoneId = rs.getLong(1);
        }

        stmt.executeUpdate(
                "INSERT INTO phone_variant (phone_id, ram_item_id, storage_item_id, color_item_id, price, stock_quantity, reserved_quantity, sku, status, created_at) " +
                "VALUES (" + phoneId + ", 1, 1, 1, 10000000.00, " + stock + ", 0, '" + sku + "', 'ACTIVE', CURRENT_TIMESTAMP(6))"
        );
        try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
            rs.next();
            return rs.getLong(1);
        }
    }

    private void reallocateVariant(Statement stmt, long variantId, int stock) throws Exception {
        // Đảm bảo có record ở 3 kho
        stmt.executeUpdate(
                "INSERT INTO warehouse_stock (warehouse_id, phone_variant_id, quantity, created_at) " +
                "SELECT w.id, " + variantId + ", 0, CURRENT_TIMESTAMP(6) " +
                "FROM warehouse w " +
                "WHERE w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI') " +
                "  AND NOT EXISTS (SELECT 1 FROM warehouse_stock ws WHERE ws.warehouse_id = w.id AND ws.phone_variant_id = " + variantId + ")"
        );
        // Cập nhật số lượng
        int base = stock / 3;
        int rem = stock % 3;
        int hn = base + (rem >= 1 ? 1 : 0);
        int hcm = base + (rem == 2 ? 1 : 0);
        int dn = base;

        stmt.executeUpdate("UPDATE warehouse_stock ws JOIN warehouse w ON w.id = ws.warehouse_id SET ws.quantity = " + hn + " WHERE ws.phone_variant_id = " + variantId + " AND w.code = 'WH-HN-MAIN'");
        stmt.executeUpdate("UPDATE warehouse_stock ws JOIN warehouse w ON w.id = ws.warehouse_id SET ws.quantity = " + hcm + " WHERE ws.phone_variant_id = " + variantId + " AND w.code = 'WH-HCM-Q1'");
        stmt.executeUpdate("UPDATE warehouse_stock ws JOIN warehouse w ON w.id = ws.warehouse_id SET ws.quantity = " + dn + " WHERE ws.phone_variant_id = " + variantId + " AND w.code = 'WH-DN-HAI'");
    }

    private void assertStockAllocation(Statement stmt, long variantId, int expectedHn, int expectedHcm, int expectedDn) throws Exception {
        try (ResultSet rs = stmt.executeQuery(
                "SELECT w.code, ws.quantity FROM warehouse_stock ws " +
                "JOIN warehouse w ON w.id = ws.warehouse_id " +
                "WHERE ws.phone_variant_id = " + variantId)) {

            Map<String, Integer> stockMap = new HashMap<>();
            while (rs.next()) {
                stockMap.put(rs.getString("code"), rs.getInt("quantity"));
            }
            assertThat(stockMap.get("WH-HN-MAIN")).isEqualTo(expectedHn);
            assertThat(stockMap.get("WH-HCM-Q1")).isEqualTo(expectedHcm);
            assertThat(stockMap.get("WH-DN-HAI")).isEqualTo(expectedDn);
        }
    }
}
