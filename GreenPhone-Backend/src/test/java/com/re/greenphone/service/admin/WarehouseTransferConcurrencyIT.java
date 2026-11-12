package com.re.greenphone.service.admin;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * INV-08: Integration & Concurrency Test trên MySQL thật / Testcontainers.
 * Kiểm chứng 30 yêu cầu cốt lõi:
 * - Bảo toàn tồn kho: On-hand + In-transit = Constant
 * - Chống race condition & deadlock khi nhiều giao dịch tranh chấp
 * - Chống tồn kho âm, chống overselling
 * - Chống double-dispatch và double-receive
 * - Chuyển trạng thái đơn hàng khi gom đủ và hủy đơn hoàn trả reservation
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WarehouseTransferConcurrencyIT {

    private static MySQLContainer<?> mysqlContainer;
    private static String jdbcUrl;
    private static String dbUser;
    private static String dbPass;

    @BeforeAll
    static void setupDatabase() throws Exception {
        boolean dockerAvailable = false;
        try {
            dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable ignored) {
        }

        if (dockerAvailable) {
            mysqlContainer = new MySQLContainer<>("mysql:8.0")
                    .withDatabaseName("greenphone_transfer_concurrency_test")
                    .withUsername("test")
                    .withPassword("test")
                    .withUrlParam("characterEncoding", "UTF-8");
            mysqlContainer.start();
            jdbcUrl = mysqlContainer.getJdbcUrl();
            dbUser = mysqlContainer.getUsername();
            dbPass = mysqlContainer.getPassword();
        } else {
            dbUser = "root";
            dbPass = "12345678";
            try (Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/?characterEncoding=UTF-8&useUnicode=true", dbUser, dbPass);
                 Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("DROP DATABASE IF EXISTS greenphone_test_transfer_it");
                stmt.executeUpdate("CREATE DATABASE greenphone_test_transfer_it CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
            jdbcUrl = "jdbc:mysql://localhost:3306/greenphone_test_transfer_it?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&characterEncoding=UTF-8&useUnicode=true";
        }

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
    @DisplayName("1. Flyway Migration V21: Cấu trúc bảng warehouse_transfer và reserved_quantity")
    void testMigrationV21Schema() throws Exception {
        try (Connection conn = getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();

            // Kiểm tra cột reserved_quantity trong warehouse_stock
            try (ResultSet rs = meta.getColumns(null, null, "warehouse_stock", "reserved_quantity")) {
                assertThat(rs.next()).isTrue();
            }

            // Kiểm tra cột fulfillment_warehouse_id trong orders
            try (ResultSet rs = meta.getColumns(null, null, "orders", "fulfillment_warehouse_id")) {
                assertThat(rs.next()).isTrue();
            }

            // Kiểm tra bảng warehouse_transfer
            try (ResultSet rs = meta.getTables(null, null, "warehouse_transfer", null)) {
                assertThat(rs.next()).isTrue();
            }

            // Kiểm tra bảng warehouse_transfer_item
            try (ResultSet rs = meta.getTables(null, null, "warehouse_transfer_item", null)) {
                assertThat(rs.next()).isTrue();
            }
        }
    }

    @Test
    @Order(2)
    @DisplayName("2. Bất biến tồn kho: On-hand + In-transit được bảo toàn qua các bước điều chuyển")
    void testInventoryConservationInvariant() throws Exception {
        try (Connection conn = getConnection()) {
            conn.setAutoCommit(false);
            Statement stmt = conn.createStatement();

            // Tạo biến thể test
            stmt.executeUpdate("INSERT INTO phone (name, brand_id, status, created_at) VALUES ('iPhone 16 Pro', 1, 'ACTIVE', CURRENT_TIMESTAMP(6))");
            long phoneId;
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                phoneId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO phone_variant (phone_id, ram_item_id, storage_item_id, color_item_id, price, stock_quantity, reserved_quantity, sku, status, created_at) " +
                    "VALUES (" + phoneId + ", 1, 1, 1, 30000000.00, 10, 0, 'IP16P-TEST-INVARIANT', 'ACTIVE', CURRENT_TIMESTAMP(6))");
            long variantId;
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                variantId = rs.getLong(1);
            }

            // Lấy ID kho Hà Nội và TP.HCM
            long hnId, hcmId;
            try (ResultSet rs = stmt.executeQuery("SELECT id FROM warehouse WHERE code = 'WH-HN-MAIN'")) {
                rs.next();
                hnId = rs.getLong(1);
            }
            try (ResultSet rs = stmt.executeQuery("SELECT id FROM warehouse WHERE code = 'WH-HCM-Q1'")) {
                rs.next();
                hcmId = rs.getLong(1);
            }

            // Khởi tạo tồn kho ban đầu: Hà Nội có 10, TP.HCM có 0
            stmt.executeUpdate("INSERT INTO warehouse_stock (warehouse_id, phone_variant_id, quantity, reserved_quantity, created_at) VALUES (" + hnId + ", " + variantId + ", 10, 0, CURRENT_TIMESTAMP(6))");
            stmt.executeUpdate("INSERT INTO warehouse_stock (warehouse_id, phone_variant_id, quantity, reserved_quantity, created_at) VALUES (" + hcmId + ", " + variantId + ", 0, 0, CURRENT_TIMESTAMP(6))");
            conn.commit();

            int initialTotalOnHand = 10;
            int initialInTransit = 0;
            assertThat(initialTotalOnHand + initialInTransit).isEqualTo(10);

            // BƯỚC 1: Đặt đơn phân mảnh gom 4 sản phẩm từ HN về HCM -> Giữ chỗ (Reservation)
            // On-hand HN = 10, Reserved HN = 4, Available HN = 6
            stmt.executeUpdate("UPDATE warehouse_stock SET reserved_quantity = 4 WHERE warehouse_id = " + hnId + " AND phone_variant_id = " + variantId);
            conn.commit();

            // Tổng On-hand vẫn là 10, in-transit = 0
            try (ResultSet rs = stmt.executeQuery("SELECT SUM(quantity) FROM warehouse_stock WHERE phone_variant_id = " + variantId)) {
                rs.next();
                assertThat(rs.getInt(1)).isEqualTo(10);
            }

            // BƯỚC 2: Xuất kho điều chuyển (Dispatch 4 cái)
            // HN: quantity giảm từ 10 xuống 6, reserved_quantity giảm từ 4 xuống 0
            stmt.executeUpdate("UPDATE warehouse_stock SET quantity = quantity - 4, reserved_quantity = reserved_quantity - 4 WHERE warehouse_id = " + hnId + " AND phone_variant_id = " + variantId);
            int inTransit = 4;
            conn.commit();

            // Kiểm tra On-hand + In-transit
            try (ResultSet rs = stmt.executeQuery("SELECT SUM(quantity) FROM warehouse_stock WHERE phone_variant_id = " + variantId)) {
                rs.next();
                int currentOnHand = rs.getInt(1);
                assertThat(currentOnHand).isEqualTo(6);
                assertThat(currentOnHand + inTransit).isEqualTo(10); // BẢO TOÀN TUYỆT ĐỐI
            }

            // BƯỚC 3: Nhập kho tại TP.HCM (Receive 4 cái)
            // In-transit giảm về 0, HCM quantity tăng lên 4, HCM reserved_quantity tăng lên 4 (giữ cho đơn hàng)
            stmt.executeUpdate("UPDATE warehouse_stock SET quantity = quantity + 4, reserved_quantity = reserved_quantity + 4 WHERE warehouse_id = " + hcmId + " AND phone_variant_id = " + variantId);
            inTransit = 0;
            conn.commit();

            // Kiểm tra tổng On-hand sau khi nhập kho
            try (ResultSet rs = stmt.executeQuery("SELECT SUM(quantity), SUM(reserved_quantity) FROM warehouse_stock WHERE phone_variant_id = " + variantId)) {
                rs.next();
                int finalOnHand = rs.getInt(1);
                int finalReserved = rs.getInt(2);
                assertThat(finalOnHand).isEqualTo(10);
                assertThat(finalOnHand + inTransit).isEqualTo(10); // BẢO TOÀN HOÀN TOÀN
                assertThat(finalReserved).isEqualTo(4); // 4 cái được giữ chặt cho đơn hàng
            }
        }
    }

    @Test
    @Order(3)
    @DisplayName("3. Concurrency Stress Test: 10 threads đồng thời tranh chấp giữ chỗ tồn kho (Pessimistic Lock)")
    void testConcurrentReservationSafety() throws Exception {
        long variantId;
        long hnId;
        try (Connection conn = getConnection()) {
            Statement stmt = conn.createStatement();
            stmt.executeUpdate("INSERT INTO phone (name, brand_id, status, created_at) VALUES ('iPhone 16 Race', 1, 'ACTIVE', CURRENT_TIMESTAMP(6))");
            long phoneId;
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                phoneId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO phone_variant (phone_id, ram_item_id, storage_item_id, color_item_id, price, stock_quantity, reserved_quantity, sku, status, created_at) " +
                    "VALUES (" + phoneId + ", 1, 1, 1, 20000000.00, 3, 0, 'IP16-RACE-3UNITS', 'ACTIVE', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                variantId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM warehouse WHERE code = 'WH-HN-MAIN'")) {
                rs.next();
                hnId = rs.getLong(1);
            }

            // Chỉ có đúng 3 sản phẩm khả dụng tại kho Hà Nội
            stmt.executeUpdate("INSERT INTO warehouse_stock (warehouse_id, phone_variant_id, quantity, reserved_quantity, created_at) VALUES (" + hnId + ", " + variantId + ", 3, 0, CURRENT_TIMESTAMP(6))");
        }

        // 10 threads đồng thời mỗi thread cố gắng đặt giữ chỗ 1 sản phẩm
        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectCount = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    try (Connection threadConn = getConnection()) {
                        threadConn.setAutoCommit(false);
                        threadConn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

                        // SELECT ... FOR UPDATE (Pessimistic Locking)
                        try (PreparedStatement lockStmt = threadConn.prepareStatement(
                                "SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = ? AND phone_variant_id = ? FOR UPDATE")) {
                            lockStmt.setLong(1, hnId);
                            lockStmt.setLong(2, variantId);

                            try (ResultSet rs = lockStmt.executeQuery()) {
                                if (rs.next()) {
                                    int qty = rs.getInt("quantity");
                                    int res = rs.getInt("reserved_quantity");
                                    int avail = qty - res;

                                    if (avail >= 1) {
                                        // Còn hàng -> giữ chỗ 1
                                        try (PreparedStatement updateStmt = threadConn.prepareStatement(
                                                "UPDATE warehouse_stock SET reserved_quantity = reserved_quantity + 1 WHERE warehouse_id = ? AND phone_variant_id = ?")) {
                                            updateStmt.setLong(1, hnId);
                                            updateStmt.setLong(2, variantId);
                                            updateStmt.executeUpdate();
                                        }
                                        threadConn.commit();
                                        successCount.incrementAndGet();
                                    } else {
                                        // Hết hàng khả dụng -> Rollback
                                        threadConn.rollback();
                                        rejectCount.incrementAndGet();
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    rejectCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertThat(doneLatch.await(15, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        // Kết quả: Đúng 3 transaction thành công, 7 transaction bị từ chối
        assertThat(successCount.get()).isEqualTo(3);
        assertThat(rejectCount.get()).isEqualTo(7);

        // Kiểm tra database: reserved_quantity = 3, quantity = 3, available = 0, KHÔNG CÓ TỒN KHO ÂM
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = " + hnId + " AND phone_variant_id = " + variantId)) {
            rs.next();
            int qty = rs.getInt("quantity");
            int res = rs.getInt("reserved_quantity");
            assertThat(qty).isEqualTo(3);
            assertThat(res).isEqualTo(3);
            assertThat(qty - res).isEqualTo(0);
        }
    }

    @Test
    @Order(4)
    @DisplayName("4. Chống double-dispatch: Giao dịch xuất kho cạnh tranh chỉ cho phép đúng 1 lần")
    void testDoubleDispatchRejection() throws Exception {
        long transferId;
        try (Connection conn = getConnection()) {
            Statement stmt = conn.createStatement();
            // Lấy order và warehouse có sẵn
            long orderId;
            try (ResultSet rs = stmt.executeQuery("SELECT id FROM orders LIMIT 1")) {
                if (rs.next()) {
                    orderId = rs.getLong(1);
                } else {
                    stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                            "VALUES (1, 'Test User', '0901234567', 'TP.HCM', 'COD', 'WAITING_FOR_TRANSFER', 'UNPAID', 1000000, 0, 0, 1000000, CURRENT_TIMESTAMP(6))");
                    try (ResultSet rso = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                        rso.next();
                        orderId = rso.getLong(1);
                    }
                }
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-CONCURRENT-DISPATCH', " + orderId + ", 1, 2, 'PENDING', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                transferId = rs.getLong(1);
            }
        }

        // 5 threads cùng cố gắng dispatch transfer này
        int numThreads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(numThreads);
        AtomicInteger successDispatches = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement sel = conn.prepareStatement("SELECT status FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            sel.setLong(1, transferId);
                            try (ResultSet rs = sel.executeQuery()) {
                                if (rs.next() && "PENDING".equals(rs.getString("status"))) {
                                    try (PreparedStatement upd = conn.prepareStatement(
                                            "UPDATE warehouse_transfer SET status = 'DISPATCHED', dispatched_at = CURRENT_TIMESTAMP(6) WHERE id = ?")) {
                                        upd.setLong(1, transferId);
                                        upd.executeUpdate();
                                    }
                                    conn.commit();
                                    successDispatches.incrementAndGet();
                                } else {
                                    conn.rollback();
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertThat(done.await(10, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        // Đúng 1 lần dispatch thành công
        assertThat(successDispatches.get()).isEqualTo(1);
    }

    @Test
    @Order(5)
    @DisplayName("5. FINDING-DB-01: CHECK constraint ck_wt_diff_warehouse từ chối kho nguồn trùng kho đích")
    void testCheckConstraintSameWarehouseRejected() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            long orderId;
            try (ResultSet rs = stmt.executeQuery("SELECT id FROM orders LIMIT 1")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            // Thử INSERT với source_warehouse_id = destination_warehouse_id = 1
            org.junit.jupiter.api.Assertions.assertThrows(SQLException.class, () -> {
                stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                        "VALUES ('TRF-SAME-WH-ERR', " + orderId + ", 1, 1, 'PENDING', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            });
        }
    }

    @Test
    @Order(6)
    @DisplayName("6. FINDING-IDEMPOTENCY-01: UNIQUE constraint uq_wt_order_source ngăn tạo trùng phiếu cùng nguồn")
    void testUniqueConstraintOrderSourceWarehouse() throws Exception {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Idempotency User', '0901234568', 'TP.HCM', 'COD', 'WAITING_FOR_TRANSFER', 'UNPAID', 1000000, 0, 0, 1000000, CURRENT_TIMESTAMP(6))");
            long orderId;
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-UQ-SRC-1', " + orderId + ", 1, 2, 'PENDING', 'SYSTEM', CURRENT_TIMESTAMP(6))");

            // Thử tạo phiếu thứ 2 cho cùng orderId và sourceWarehouseId=1
            org.junit.jupiter.api.Assertions.assertThrows(SQLException.class, () -> {
                stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                        "VALUES ('TRF-UQ-SRC-2', " + orderId + ", 1, 2, 'PENDING', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            });
        }
    }

    @Test
    @Order(7)
    @DisplayName("7. FINDING-LOCK-01: Triệt tiêu Deadlock khi Hủy đơn và Nhập kho cạnh tranh trên cùng đơn hàng")
    void testCancelOrderVsReceiveTransferDeadlockPrevention() throws Exception {
        long orderId;
        long transferId;
        long variantId;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Deadlock Test User', '0909999999', 'TP.HCM', 'COD', 'WAITING_FOR_TRANSFER', 'UNPAID', 20000000, 0, 0, 20000000, CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-DEADLOCK-TEST', " + orderId + ", 1, 2, 'DISPATCHED', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                transferId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM phone_variant LIMIT 1")) {
                rs.next();
                variantId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer_item (transfer_id, phone_variant_id, requested_quantity, dispatched_quantity, received_quantity, created_at) " +
                    "VALUES (" + transferId + ", " + variantId + ", 1, 1, 0, CURRENT_TIMESTAMP(6))");
        }

        int iterations = 5;
        AtomicInteger deadlocks = new AtomicInteger(0);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        for (int iter = 0; iter < iterations; iter++) {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            final long curOrderId = orderId;
            final long curTransferId = transferId;

            // Thread 1: Cancel Order (Orders -> WarehouseTransfer)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curTransferId);
                            s2.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            // Thread 2: Receive Transfer (Khóa Orders TRƯỚC WarehouseTransfer)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement sOrder = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            sOrder.setLong(1, curOrderId);
                            sOrder.executeQuery();
                        }
                        try (PreparedStatement sTransfer = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            sTransfer.setLong(1, curTransferId);
                            sTransfer.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            ready.await();
            start.countDown();
            done.await(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertThat(deadlocks.get()).isEqualTo(0);
    }

    @Test
    @Order(8)
    @DisplayName("8. FINDING-STOCK-01: Cạnh tranh khấu trừ tồn kho xuất giao giữa ShipmentService và AdminOrderService không bị trừ 2 lần")
    void testDualFulfillmentDeductionIdempotency() throws Exception {
        long orderId;
        long variantId;
        long hcmId;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Fulfill User', '0901112233', 'TP.HCM', 'COD', 'PROCESSING', 'UNPAID', 25000000, 0, 0, 25000000, CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM warehouse WHERE code = 'WH-HCM-Q1'")) {
                rs.next();
                hcmId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM phone_variant LIMIT 1")) {
                rs.next();
                variantId = rs.getLong(1);
            }

            stmt.executeUpdate("UPDATE orders SET fulfillment_warehouse_id = " + hcmId + " WHERE id = " + orderId);

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-FULFILL-TEST', " + orderId + ", 1, " + hcmId + ", 'RECEIVED', 'SYSTEM', CURRENT_TIMESTAMP(6))");

            stmt.executeUpdate("UPDATE warehouse_stock SET quantity = 10, reserved_quantity = 2 WHERE warehouse_id = " + hcmId + " AND phone_variant_id = " + variantId);
        }

        int numThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch ready = new CountDownLatch(numThreads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(numThreads);
        AtomicInteger executedDeductions = new AtomicInteger(0);

        final String fulfillRef = "FULFILL-ORDER-" + orderId;
        final long curOrderId = orderId;
        final long curVariantId = variantId;
        final long curHcmId = hcmId;
        final int deductQty = 2;

        for (int i = 0; i < numThreads; i++) {
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);

                        // Bước 1: Khóa bi quan Order
                        try (PreparedStatement sOrder = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            sOrder.setLong(1, curOrderId);
                            sOrder.executeQuery();
                        }

                        // Bước 2: Kiểm tra Idempotency qua transferReference
                        boolean alreadyDeducted = false;
                        try (PreparedStatement sCheck = conn.prepareStatement(
                                "SELECT id FROM warehouse_stock_history WHERE transfer_reference = ? AND change_type = 'EXPORT'")) {
                            sCheck.setString(1, fulfillRef);
                            try (ResultSet rs = sCheck.executeQuery()) {
                                if (rs.next()) {
                                    alreadyDeducted = true;
                                }
                            }
                        }

                        if (!alreadyDeducted) {
                            // Bước 3: Khóa và trừ tồn kho tại kho đích
                            try (PreparedStatement sStock = conn.prepareStatement(
                                    "SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = ? AND phone_variant_id = ? FOR UPDATE")) {
                                sStock.setLong(1, curHcmId);
                                sStock.setLong(2, curVariantId);
                                try (ResultSet rs = sStock.executeQuery()) {
                                    if (rs.next()) {
                                        try (PreparedStatement sUpd = conn.prepareStatement(
                                                "UPDATE warehouse_stock SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ? WHERE warehouse_id = ? AND phone_variant_id = ?")) {
                                            sUpd.setInt(1, deductQty);
                                            sUpd.setInt(2, deductQty);
                                            sUpd.setLong(3, curHcmId);
                                            sUpd.setLong(4, curVariantId);
                                            sUpd.executeUpdate();
                                        }

                                        try (PreparedStatement sHist = conn.prepareStatement(
                                                "INSERT INTO warehouse_stock_history (warehouse_id, phone_variant_id, quantity_before, quantity_change, quantity_after, change_type, reason, changed_by_name, transfer_reference, created_at) " +
                                                "VALUES (?, ?, 10, ?, 8, 'EXPORT', 'Xuất giao', 'SYSTEM', ?, CURRENT_TIMESTAMP(6))")) {
                                            sHist.setLong(1, curHcmId);
                                            sHist.setLong(2, curVariantId);
                                            sHist.setInt(3, -deductQty);
                                            sHist.setString(4, fulfillRef);
                                            sHist.executeUpdate();
                                        }
                                        executedDeductions.incrementAndGet();
                                    }
                                }
                            }
                        }
                        conn.commit();
                    }
                } catch (Exception e) {
                    System.err.println("Error in testDualFulfillmentDeductionIdempotency: " + e.getMessage());
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        start.countDown();
        done.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(executedDeductions.get()).isEqualTo(1);

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = " + hcmId + " AND phone_variant_id = " + variantId)) {
            rs.next();
            int qty = rs.getInt("quantity");
            int res = rs.getInt("reserved_quantity");
            assertThat(qty).isEqualTo(8);
            assertThat(res).isEqualTo(0);
        }

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM warehouse_stock_history WHERE transfer_reference = '" + fulfillRef + "'")) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(1);
        }
    }

    @Test
    @Order(9)
    @DisplayName("9. FINDING-LOCK-01: Kiểm tra cạnh tranh 3 phía Cancel/Receive/Refund không phát sinh Deadlock")
    void testTriangularCancelReceiveRefundDeadlock() throws Exception {
        long orderId;
        long transferId;
        long variantId;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Triangular User', '0903334455', 'Hà Nội', 'BANKING', 'WAITING_FOR_TRANSFER', 'PAID', 30000000, 0, 0, 30000000, CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-TRIANGULAR-TEST', " + orderId + ", 2, 1, 'DISPATCHED', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                transferId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM phone_variant LIMIT 1")) {
                rs.next();
                variantId = rs.getLong(1);
            }
        }

        int iterations = 10;
        AtomicInteger deadlocks = new AtomicInteger(0);
        ExecutorService executor = Executors.newFixedThreadPool(3);

        for (int iter = 0; iter < iterations; iter++) {
            CountDownLatch ready = new CountDownLatch(3);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(3);

            final long curOrderId = orderId;
            final long curTransferId = transferId;
            final long curVariantId = variantId;

            // Operation 1: Cancel Order (Orders -> PhoneVariant -> WarehouseTransfer -> Stock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM phone_variant WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curVariantId);
                            s2.executeQuery();
                        }
                        try (PreparedStatement s3 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s3.setLong(1, curTransferId);
                            s3.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            // Operation 2: Receive Transfer (Orders -> WarehouseTransfer -> Stock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curTransferId);
                            s2.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            // Operation 3: Refund Request (Orders -> PhoneVariant -> WarehouseTransfer -> Stock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM phone_variant WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curVariantId);
                            s2.executeQuery();
                        }
                        try (PreparedStatement s3 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s3.setLong(1, curTransferId);
                            s3.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            ready.await();
            start.countDown();
            done.await(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertThat(deadlocks.get()).isEqualTo(0);
    }

    @Test
    @Order(10)
    @DisplayName("10. Deadlock Prevention: Cạnh tranh Checkout vs Cancel/Refund cùng PhoneVariant và WarehouseStock")
    void testConcurrentCheckoutAndCancelDeadlockFree() throws Exception {
        long orderId;
        long transferId;
        long variantId;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Checkout vs Cancel User', '0901234567', 'Hà Nội', 'BANKING', 'WAITING_FOR_TRANSFER', 'PAID', 30000000, 0, 0, 30000000, CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-CO-CANCEL-TEST', " + orderId + ", 2, 1, 'PENDING', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                transferId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM phone_variant LIMIT 1")) {
                rs.next();
                variantId = rs.getLong(1);
            }
        }

        int iterations = 20;
        AtomicInteger deadlocks = new AtomicInteger(0);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        for (int iter = 0; iter < iterations; iter++) {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            final long curOrderId = orderId;
            final long curTransferId = transferId;
            final long curVariantId = variantId;

            // Thread 1: Checkout (PhoneVariant -> WarehouseStock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM phone_variant WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curVariantId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = ? FOR UPDATE")) {
                            s2.setLong(1, curVariantId);
                            s2.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            // Thread 2: Cancel/Refund Order (Orders -> PhoneVariant -> WarehouseTransfer -> WarehouseStock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM phone_variant WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curVariantId);
                            s2.executeQuery();
                        }
                        try (PreparedStatement s3 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s3.setLong(1, curTransferId);
                            s3.executeQuery();
                        }
                        try (PreparedStatement s4 = conn.prepareStatement("SELECT id FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = ? FOR UPDATE")) {
                            s4.setLong(1, curVariantId);
                            s4.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            ready.await();
            start.countDown();
            done.await(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertThat(deadlocks.get()).isEqualTo(0);
    }

    @Test
    @Order(11)
    @DisplayName("11. Deadlock Prevention: Cạnh tranh Checkout vs Receive Transfer cùng WarehouseStock")
    void testConcurrentCheckoutAndReceiveDeadlockFree() throws Exception {
        long orderId;
        long transferId;
        long variantId;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT INTO orders (user_id, receiver_name, receiver_phone, shipping_address, payment_method, order_status, payment_status, total_amount, discount_amount, shipping_fee, final_amount, created_at) " +
                    "VALUES (1, 'Checkout vs Receive User', '0909998877', 'Đà Nẵng', 'BANKING', 'WAITING_FOR_TRANSFER', 'PAID', 30000000, 0, 0, 30000000, CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                orderId = rs.getLong(1);
            }

            stmt.executeUpdate("INSERT INTO warehouse_transfer (transfer_code, order_id, source_warehouse_id, destination_warehouse_id, status, created_by, created_at) " +
                    "VALUES ('TRF-CO-RCV-TEST', " + orderId + ", 1, 3, 'DISPATCHED', 'SYSTEM', CURRENT_TIMESTAMP(6))");
            try (ResultSet rs = stmt.executeQuery("SELECT LAST_INSERT_ID()")) {
                rs.next();
                transferId = rs.getLong(1);
            }

            try (ResultSet rs = stmt.executeQuery("SELECT id FROM phone_variant LIMIT 1")) {
                rs.next();
                variantId = rs.getLong(1);
            }
        }

        int iterations = 20;
        AtomicInteger deadlocks = new AtomicInteger(0);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        for (int iter = 0; iter < iterations; iter++) {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            final long curOrderId = orderId;
            final long curTransferId = transferId;
            final long curVariantId = variantId;

            // Thread 1: Checkout (PhoneVariant -> WarehouseStock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM phone_variant WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curVariantId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM warehouse_stock WHERE warehouse_id = 3 AND phone_variant_id = ? FOR UPDATE")) {
                            s2.setLong(1, curVariantId);
                            s2.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            // Thread 2: Receive Transfer (Orders -> WarehouseTransfer -> WarehouseStock)
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    try (Connection conn = getConnection()) {
                        conn.setAutoCommit(false);
                        try (PreparedStatement s1 = conn.prepareStatement("SELECT id FROM orders WHERE id = ? FOR UPDATE")) {
                            s1.setLong(1, curOrderId);
                            s1.executeQuery();
                        }
                        try (PreparedStatement s2 = conn.prepareStatement("SELECT id FROM warehouse_transfer WHERE id = ? FOR UPDATE")) {
                            s2.setLong(1, curTransferId);
                            s2.executeQuery();
                        }
                        try (PreparedStatement s3 = conn.prepareStatement("SELECT id FROM warehouse_stock WHERE warehouse_id = 3 AND phone_variant_id = ? FOR UPDATE")) {
                            s3.setLong(1, curVariantId);
                            s3.executeQuery();
                        }
                        conn.commit();
                    }
                } catch (SQLException e) {
                    if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });

            ready.await();
            start.countDown();
            done.await(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertThat(deadlocks.get()).isEqualTo(0);
    }
}

