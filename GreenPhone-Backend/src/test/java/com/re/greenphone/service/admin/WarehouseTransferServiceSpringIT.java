package com.re.greenphone.service.admin;

import com.re.greenphone.config.DataInitializer;
import com.re.greenphone.dto.request.CreateRefundRequest;
import com.re.greenphone.dto.request.CreateShipmentRequest;
import com.re.greenphone.dto.request.OrderItemRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.dto.response.RefundDTO;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.entity.Option;
import com.re.greenphone.entity.OptionItem;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.entity.WarehouseStock;
import com.re.greenphone.entity.WarehouseTransfer;
import com.re.greenphone.entity.WarehouseTransferItem;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.RoleRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.repository.WarehouseRepository;
import com.re.greenphone.repository.WarehouseStockHistoryRepository;
import com.re.greenphone.repository.WarehouseStockRepository;
import com.re.greenphone.repository.WarehouseTransferRepository;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.EmailService;
import com.re.greenphone.service.OrderService;
import com.re.greenphone.service.RefundService;
import com.re.greenphone.service.ShipmentService;
import com.re.greenphone.service.WarehouseTransferService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;

/**
 * INV-08: Spring Service-level Integration Tests verifying real service execution,
 * proxy transactions, Hibernate flush lifecycles, and concurrency invariant conservation.
 */
@Testcontainers
@SpringBootTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=true",
        "spring.flyway.baseline-on-migrate=true",
        "spring.cache.type=none",
        "spring.data.redis.repositories.enabled=false",
        "CLOUDINARY_CLOUD_NAME=test",
        "CLOUDINARY_API_KEY=test",
        "CLOUDINARY_API_SECRET=test",
        "SEPAY_ACCOUNT_NUMBER=test",
        "SEPAY_BANK_CODE=VCB",
        "SEPAY_ACCOUNT_HOLDER=test",
        "SEPAY_STORE_NAME=test",
        "SEPAY_API_TOKEN=test",
        "SEPAY_WEBHOOK_SECRET=test",
        "MAIL_HOST=localhost",
        "MAIL_PORT=3025",
        "MAIL_USERNAME=test",
        "MAIL_PASSWORD=test",
        "JWT_SECRET=test-secret-key-for-integration-tests-12345678901234567890",
        "JWT_EXPIRATION=3600000"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WarehouseTransferServiceSpringIT {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("greenphone_test_services")
            .withUrlParam("connectionTimeZone", "UTC")
            .withUrlParam("forceConnectionTimeZoneToSession", "true")
            .withUrlParam("useUnicode", "true")
            .withUrlParam("characterEncoding", "UTF-8")
            .withReuse(false);

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired private OrderService orderService;
    @Autowired private RefundService refundService;
    @Autowired private WarehouseTransferService warehouseTransferService;
    @Autowired private ShipmentService shipmentService;
    @Autowired private AdminOrderService adminOrderService;

    @Autowired private PhoneVariantRepository phoneVariantRepository;
    @Autowired private WarehouseStockRepository warehouseStockRepository;
    @Autowired private WarehouseStockHistoryRepository warehouseStockHistoryRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private WarehouseTransferRepository warehouseTransferRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private TransactionTemplate transactionTemplate;
    @Autowired private EntityManager em;

    @MockitoBean private DataInitializer dataInitializer;
    @MockitoBean private EmailService emailService;
    @MockitoBean private RedisTemplate<String, Object> redisTemplate;
    @MockitoBean private StringRedisTemplate stringRedisTemplate;

    private Long customerId;
    private Long adminUserId;
    private Long warehouseHnId;
    private Long warehouseSgId;
    private Long warehouseDnId;
    private Long variantId;

    @BeforeEach
    void setUpFixtures() {
        ValueOperations valOps = mock(ValueOperations.class);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valOps);
        lenient().when(valOps.setIfAbsent(anyString(), any(), anyLong(), any())).thenReturn(true);
        lenient().when(stringRedisTemplate.opsForValue()).thenReturn(valOps);

        transactionTemplate.execute(status -> {
            // Clean up old data with FK checks disabled
            em.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `warehouse_stock_history`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `warehouse_transfer_item`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `warehouse_transfer`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `shipment_history`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `shipment`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `refund_transaction`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `refund`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `order_histories`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `review`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `order_detail`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `orders`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `warehouse_stock`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `phone_variant`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `phone`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `brand`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `option_item`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `option`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `users`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `role`").executeUpdate();
            em.createNativeQuery("TRUNCATE TABLE `warehouse`").executeUpdate();
            em.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

            // 1. Roles & Users
            Role roleCustomer = Role.builder().name("ROLE_CUSTOMER").description("Customer").build();
            Role roleAdmin = Role.builder().name("ROLE_ADMIN").description("Admin").build();
            em.persist(roleCustomer);
            em.persist(roleAdmin);

            User customer = new User();
            customer.setFullName("Spring Customer");
            customer.setEmail("cust@test.com");
            customer.setPassword("pass");
            customer.setPhone("0901112222");
            customer.setRole(roleCustomer);
            customer.setStatus("ACTIVE");
            em.persist(customer);

            User admin = new User();
            admin.setFullName("Spring Admin");
            admin.setEmail("admin@test.com");
            admin.setPassword("pass");
            admin.setPhone("0903334444");
            admin.setRole(roleAdmin);
            admin.setStatus("ACTIVE");
            em.persist(admin);

            customerId = customer.getId();
            adminUserId = admin.getId();

            // 2. Warehouses (Hà Nội, TP.HCM, Đà Nẵng)
            Warehouse hn = new Warehouse();
            hn.setCode("WH-HN-MAIN"); hn.setName("Kho Hà Nội"); hn.setAddress("Hà Nội");
            hn.setLatitude(new BigDecimal("21.028511")); hn.setLongitude(new BigDecimal("105.854444"));
            hn.setStatus("ACTIVE");
            em.persist(hn);

            Warehouse sg = new Warehouse();
            sg.setCode("WH-HCM-Q1"); sg.setName("Kho TP.HCM"); sg.setAddress("TP.HCM");
            sg.setLatitude(new BigDecimal("10.776889")); sg.setLongitude(new BigDecimal("106.700806"));
            sg.setStatus("ACTIVE");
            em.persist(sg);

            Warehouse dn = new Warehouse();
            dn.setCode("WH-DN-HAI-CHAU"); dn.setName("Kho Đà Nẵng"); dn.setAddress("Đà Nẵng");
            dn.setLatitude(new BigDecimal("16.047079")); dn.setLongitude(new BigDecimal("108.206230"));
            dn.setStatus("ACTIVE");
            em.persist(dn);

            warehouseHnId = hn.getId();
            warehouseSgId = sg.getId();
            warehouseDnId = dn.getId();

            // 3. Product & Options & Variant
            Brand brand = Brand.builder().name("Apple").status("ACTIVE").build();
            em.persist(brand);

            Option optRam = Option.builder().type("RAM").label("RAM").build();
            em.persist(optRam);
            OptionItem itemRam = OptionItem.builder().option(optRam).value("8GB").build();
            em.persist(itemRam);

            Option optStorage = Option.builder().type("STORAGE").label("Storage").build();
            em.persist(optStorage);
            OptionItem itemStorage = OptionItem.builder().option(optStorage).value("256GB").build();
            em.persist(itemStorage);

            Option optColor = Option.builder().type("COLOR").label("Color").build();
            em.persist(optColor);
            OptionItem itemColor = OptionItem.builder().option(optColor).value("Black").hexColor("#000000").build();
            em.persist(itemColor);

            Phone phone = Phone.builder().name("iPhone 16 Pro Max").brand(brand).status("ACTIVE").build();
            em.persist(phone);

            PhoneVariant variant = PhoneVariant.builder()
                    .phone(phone)
                    .ramItem(itemRam)
                    .storageItem(itemStorage)
                    .colorItem(itemColor)
                    .price(new BigDecimal("30000000.00"))
                    .stockQuantity(10)
                    .reservedQuantity(0)
                    .sku("IP16PM-SPRING-IT")
                    .status("ACTIVE")
                    .build();
            em.persist(variant);
            variantId = variant.getId();

            // 4. Warehouse Stocks (Hà Nội: 6, TP.HCM: 4, Đà Nẵng: 0)
            WarehouseStock stockHn = new WarehouseStock();
            stockHn.setWarehouse(hn); stockHn.setPhoneVariant(variant);
            stockHn.setQuantity(6); stockHn.setReservedQuantity(0);
            em.persist(stockHn);

            WarehouseStock stockSg = new WarehouseStock();
            stockSg.setWarehouse(sg); stockSg.setPhoneVariant(variant);
            stockSg.setQuantity(4); stockSg.setReservedQuantity(0);
            em.persist(stockSg);

            WarehouseStock stockDn = new WarehouseStock();
            stockDn.setWarehouse(dn); stockDn.setPhoneVariant(variant);
            stockDn.setQuantity(0); stockDn.setReservedQuantity(0);
            em.persist(stockDn);

            em.flush();
            return null;
        });
    }

    @Test
    @org.junit.jupiter.api.Order(1)
    @DisplayName("1. Spring Service: OrderService.createOrder cạnh tranh với OrderService.cancelOrder")
    void testConcurrentCreateOrderAndCancelOrder() throws Exception {
        // Pre-create an order for cancellation
        Long existingOrderId = transactionTemplate.execute(status -> {
            User user = userRepository.findById(customerId).orElseThrow();
            PhoneVariant variant = phoneVariantRepository.findById(variantId).orElseThrow();
            Warehouse hn = warehouseRepository.findById(warehouseHnId).orElseThrow();

            Order order = Order.builder()
                    .user(user)
                    .receiverName("Existing Receiver")
                    .receiverPhone("0912345678")
                    .shippingAddress("Hà Nội")
                    .paymentMethod("COD")
                    .orderStatus("CONFIRMED")
                    .paymentStatus("UNPAID")
                    .totalAmount(new BigDecimal("30000000.00"))
                    .finalAmount(new BigDecimal("30000000.00"))
                    .orderDetails(new ArrayList<>())
                    .build();
            order = orderRepository.save(order);

            OrderDetail detail = OrderDetail.builder()
                    .order(order)
                    .phoneVariant(variant)
                    .productName("iPhone 16 Pro Max")
                    .ram("8GB")
                    .storage("256GB")
                    .color("Black")
                    .unitPrice(variant.getPrice())
                    .quantity(2)
                    .subtotal(variant.getPrice().multiply(new BigDecimal(2)))
                    .warehouseId(hn.getId())
                    .build();
            order.getOrderDetails().add(detail);

            // Deduct aggregate stock for this existing order
            variant.setStockQuantity(variant.getStockQuantity() - 2);
            phoneVariantRepository.save(variant);

            return order.getId();
        });

        int numWorkers = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numWorkers);
        CountDownLatch startSignal = new CountDownLatch(1);

        // Worker 1: createOrder (Checkout buying 2 units)
        Callable<OrderDTO> createOrderTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(customerId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

                OrderRequest req = OrderRequest.builder()
                        .receiverName("Concurrent Buyer")
                        .receiverPhone("0988776655")
                        .shippingAddress("Hà Nội")
                        .paymentMethod("COD")
                        .latitude(21.028511)
                        .longitude(105.854444)
                        .items(List.of(new OrderItemRequest(variantId, 2)))
                        .build();

                return orderService.createOrder(req);
            }
        };

        // Worker 2: cancelOrder (Cancel existing order restoring 2 units)
        Callable<OrderDTO> cancelOrderTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(customerId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

                return orderService.cancelOrder(existingOrderId, "Khách đổi ý");
            }
        };

        Future<OrderDTO> future1 = executor.submit(createOrderTask);
        Future<OrderDTO> future2 = executor.submit(cancelOrderTask);

        startSignal.countDown();

        OrderDTO createdOrder = future1.get(15, TimeUnit.SECONDS);
        OrderDTO cancelledOrder = future2.get(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(createdOrder).isNotNull();
        assertThat(cancelledOrder).isNotNull();
        assertThat(cancelledOrder.getOrderStatus()).isEqualTo("CANCELLED");

        // Verify Invariants:
        // Initial stock = 10. Existing order pre-deducted 2 -> 8.
        // Worker 1 bought 2 (-2). Worker 2 cancelled 2 (+2).
        // Final aggregate stock MUST BE EXACTLY 8 (10 - 2 - 2 + 2 = 8).
        PhoneVariant variantAfter = phoneVariantRepository.findById(variantId).orElseThrow();
        assertThat(variantAfter.getStockQuantity()).isEqualTo(8);
        assertThat(variantAfter.getStockQuantity()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    @DisplayName("2. Spring Service: OrderService.createOrder cạnh tranh với RefundService.requestRefund")
    void testConcurrentCreateOrderAndRequestRefund() throws Exception {
        // Pre-create a paid order for refund
        Long existingPaidOrderId = transactionTemplate.execute(status -> {
            User user = userRepository.findById(customerId).orElseThrow();
            PhoneVariant variant = phoneVariantRepository.findById(variantId).orElseThrow();
            Warehouse sg = warehouseRepository.findById(warehouseSgId).orElseThrow();

            Order order = Order.builder()
                    .user(user)
                    .receiverName("Paid Receiver")
                    .receiverPhone("0933334444")
                    .shippingAddress("TP.HCM")
                    .paymentMethod("BANKING")
                    .orderStatus("CONFIRMED")
                    .paymentStatus("PAID")
                    .totalAmount(new BigDecimal("30000000.00"))
                    .finalAmount(new BigDecimal("30000000.00"))
                    .orderDetails(new ArrayList<>())
                    .build();
            order = orderRepository.save(order);

            OrderDetail detail = OrderDetail.builder()
                    .order(order)
                    .phoneVariant(variant)
                    .productName("iPhone 16 Pro Max")
                    .ram("8GB")
                    .storage("256GB")
                    .color("Black")
                    .unitPrice(variant.getPrice())
                    .quantity(1)
                    .subtotal(variant.getPrice())
                    .warehouseId(sg.getId())
                    .build();
            order.getOrderDetails().add(detail);

            // Deduct aggregate stock for this existing order
            variant.setStockQuantity(variant.getStockQuantity() - 1);
            phoneVariantRepository.save(variant);

            return order.getId();
        });

        int numWorkers = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numWorkers);
        CountDownLatch startSignal = new CountDownLatch(1);

        // Worker 1: createOrder (Checkout buying 1 unit)
        Callable<OrderDTO> createOrderTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(customerId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

                OrderRequest req = OrderRequest.builder()
                        .receiverName("Buyer 2")
                        .receiverPhone("0911223344")
                        .shippingAddress("TP.HCM")
                        .paymentMethod("COD")
                        .latitude(10.776889)
                        .longitude(106.700806)
                        .items(List.of(new OrderItemRequest(variantId, 1)))
                        .build();

                return orderService.createOrder(req);
            }
        };

        // Worker 2: requestRefund (Refund paid order restoring 1 unit)
        Callable<RefundDTO> refundTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(customerId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

                CreateRefundRequest req = CreateRefundRequest.builder()
                        .reason("Không có nhu cầu nữa")
                        .bankName("Vietcombank")
                        .bankAccount("123456789")
                        .accountHolder("SPRING CUSTOMER")
                        .build();

                return refundService.requestRefund(existingPaidOrderId, req);
            }
        };

        Future<OrderDTO> future1 = executor.submit(createOrderTask);
        Future<RefundDTO> future2 = executor.submit(refundTask);

        startSignal.countDown();

        OrderDTO createdOrder = future1.get(15, TimeUnit.SECONDS);
        RefundDTO refundRes = future2.get(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(createdOrder).isNotNull();
        assertThat(refundRes).isNotNull();
        assertThat(refundRes.getStatus()).isEqualTo("REQUESTED");

        // Verify Invariants:
        PhoneVariant variantAfter = phoneVariantRepository.findById(variantId).orElseThrow();
        assertThat(variantAfter.getStockQuantity()).isGreaterThanOrEqualTo(0);

        Order refundedOrder = orderRepository.findById(existingPaidOrderId).orElseThrow();
        assertThat(refundedOrder.getOrderStatus()).isEqualTo("CANCELLED");
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @DisplayName("3. Spring Service: WarehouseTransferService.receiveTransfer cạnh tranh với OrderService.cancelOrder")
    void testConcurrentReceiveTransferAndCancelOrder() throws Exception {
        // Setup a fragmented order waiting for transfer
        Map<String, Long> ids = transactionTemplate.execute(status -> {
            User user = userRepository.findById(customerId).orElseThrow();
            PhoneVariant variant = phoneVariantRepository.findById(variantId).orElseThrow();
            Warehouse hn = warehouseRepository.findById(warehouseHnId).orElseThrow();
            Warehouse dn = warehouseRepository.findById(warehouseDnId).orElseThrow();

            Order order = Order.builder()
                    .user(user)
                    .receiverName("Waiting Receiver")
                    .receiverPhone("0944445555")
                    .shippingAddress("Đà Nẵng")
                    .paymentMethod("COD")
                    .orderStatus("WAITING_FOR_TRANSFER")
                    .paymentStatus("UNPAID")
                    .fulfillmentWarehouse(dn)
                    .totalAmount(new BigDecimal("30000000.00"))
                    .finalAmount(new BigDecimal("30000000.00"))
                    .orderDetails(new ArrayList<>())
                    .build();
            order = orderRepository.save(order);

            OrderDetail detail = OrderDetail.builder()
                    .order(order)
                    .phoneVariant(variant)
                    .productName("iPhone 16 Pro Max")
                    .ram("8GB")
                    .storage("256GB")
                    .color("Black")
                    .unitPrice(variant.getPrice())
                    .quantity(1)
                    .subtotal(variant.getPrice())
                    .warehouseId(dn.getId())
                    .build();
            order.getOrderDetails().add(detail);

            // Transfer from HN to DN
            WarehouseTransfer transfer = WarehouseTransfer.builder()
                    .transferCode("TRF-SPRING-RCV-CANCEL")
                    .order(order)
                    .sourceWarehouse(hn)
                    .destinationWarehouse(dn)
                    .status("DISPATCHED")
                    .createdBy("SYSTEM")
                    .dispatchedBy("STAFF_HN")
                    .dispatchedAt(LocalDateTime.now())
                    .items(new ArrayList<>())
                    .build();
            transfer = warehouseTransferRepository.save(transfer);

            WarehouseTransferItem item = WarehouseTransferItem.builder()
                    .transfer(transfer)
                    .phoneVariant(variant)
                    .requestedQuantity(1)
                    .dispatchedQuantity(1)
                    .receivedQuantity(0)
                    .build();
            transfer.getItems().add(item);
            warehouseTransferRepository.save(transfer);

            Map<String, Long> res = new HashMap<>();
            res.put("orderId", order.getId());
            res.put("transferId", transfer.getId());
            return res;
        });

        Long orderId = ids.get("orderId");
        Long transferId = ids.get("transferId");

        int numWorkers = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numWorkers);
        CountDownLatch startSignal = new CountDownLatch(1);

        // Worker 1: receiveTransfer
        Callable<WarehouseTransferDTO> receiveTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(adminUserId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_ADMIN");

                return warehouseTransferService.receiveTransfer(transferId, null);
            }
        };

        // Worker 2: cancelOrder
        Callable<OrderDTO> cancelTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(customerId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

                return orderService.cancelOrder(orderId, "Hủy đơn gom");
            }
        };

        Future<WarehouseTransferDTO> future1 = executor.submit(receiveTask);
        Future<OrderDTO> future2 = executor.submit(cancelTask);

        startSignal.countDown();

        WarehouseTransferDTO trfResult = future1.get(15, TimeUnit.SECONDS);
        OrderDTO cancelResult = future2.get(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(trfResult).isNotNull();
        assertThat(cancelResult).isNotNull();

        // Verify Invariants:
        // 1. Order must end in CANCELLED (cannot be PROCESSING if cancelled)
        Order finalOrder = orderRepository.findById(orderId).orElseThrow();
        assertThat(finalOrder.getOrderStatus()).isEqualTo("CANCELLED");

        // 2. Warehouse Stock at destination (Đà Nẵng):
        // Since order was cancelled, arriving goods MUST NOT be held in reservation!
        WarehouseStock stockDn = warehouseStockRepository.findByWarehouseIdAndPhoneVariantId(warehouseDnId, variantId).orElseThrow();
        assertThat(stockDn.getReservedQuantity()).isEqualTo(0);
        assertThat(stockDn.getQuantity()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @DisplayName("4. Spring Service: ShipmentService.createShipment cạnh tranh với AdminOrderService.updateStatus")
    void testConcurrentShipmentAndAdminUpdateStatus() throws Exception {
        // Setup order ready for shipment
        Long readyOrderId = transactionTemplate.execute(status -> {
            User user = userRepository.findById(customerId).orElseThrow();
            PhoneVariant variant = phoneVariantRepository.findById(variantId).orElseThrow();
            Warehouse hn = warehouseRepository.findById(warehouseHnId).orElseThrow();

            Order order = Order.builder()
                    .user(user)
                    .receiverName("Ready Receiver")
                    .receiverPhone("0977889900")
                    .shippingAddress("Hà Nội")
                    .paymentMethod("COD")
                    .orderStatus("PROCESSING")
                    .paymentStatus("UNPAID")
                    .fulfillmentWarehouse(hn)
                    .totalAmount(new BigDecimal("30000000.00"))
                    .finalAmount(new BigDecimal("30000000.00"))
                    .orderDetails(new ArrayList<>())
                    .build();
            order = orderRepository.save(order);

            OrderDetail detail = OrderDetail.builder()
                    .order(order)
                    .phoneVariant(variant)
                    .productName("iPhone 16 Pro Max")
                    .ram("8GB")
                    .storage("256GB")
                    .color("Black")
                    .unitPrice(variant.getPrice())
                    .quantity(1)
                    .subtotal(variant.getPrice())
                    .warehouseId(hn.getId())
                    .build();
            order.getOrderDetails().add(detail);

            // Transfer completed
            WarehouseTransfer transfer = WarehouseTransfer.builder()
                    .transferCode("TRF-SPRING-SHIP-TEST")
                    .order(order)
                    .sourceWarehouse(warehouseRepository.findById(warehouseSgId).orElseThrow())
                    .destinationWarehouse(hn)
                    .status("RECEIVED")
                    .createdBy("SYSTEM")
                    .items(new ArrayList<>())
                    .build();
            transfer = warehouseTransferRepository.save(transfer);

            WarehouseTransferItem item = WarehouseTransferItem.builder()
                    .transfer(transfer)
                    .phoneVariant(variant)
                    .requestedQuantity(1)
                    .dispatchedQuantity(1)
                    .receivedQuantity(1)
                    .build();
            transfer.getItems().add(item);
            warehouseTransferRepository.save(transfer);

            // Set stock and reservation at HN: quantity=5, reserved=1
            WarehouseStock stockHn = warehouseStockRepository.findByWarehouseIdAndPhoneVariantId(warehouseHnId, variantId).orElseThrow();
            stockHn.setQuantity(5);
            stockHn.setReservedQuantity(1);
            warehouseStockRepository.save(stockHn);

            return order.getId();
        });

        int numWorkers = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numWorkers);
        CountDownLatch startSignal = new CountDownLatch(1);

        // Worker 1: createShipment
        Callable<Object> shipmentTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(adminUserId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_ADMIN");

                CreateShipmentRequest req = CreateShipmentRequest.builder()
                        .orderId(readyOrderId)
                        .carrierCode("GHN")
                        .shippingFee(BigDecimal.ZERO)
                        .build();

                return shipmentService.createShipment(req);
            } catch (Exception e) {
                return e;
            }
        };

        // Worker 2: adminOrderService.updateStatus("SHIPPING")
        Callable<Object> adminStatusTask = () -> {
            startSignal.await();
            try (MockedStatic<SecurityUtils> sec = mockStatic(SecurityUtils.class)) {
                sec.when(SecurityUtils::getCurrentUserId).thenReturn(adminUserId);
                sec.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_ADMIN");

                return adminOrderService.updateStatus(readyOrderId, "SHIPPING", null);
            } catch (Exception e) {
                return e;
            }
        };

        Future<Object> future1 = executor.submit(shipmentTask);
        Future<Object> future2 = executor.submit(adminStatusTask);

        startSignal.countDown();

        Object res1 = future1.get(15, TimeUnit.SECONDS);
        Object res2 = future2.get(15, TimeUnit.SECONDS);
        executor.shutdown();

        // At least one operation succeeded
        boolean op1Success = res1 instanceof ShipmentDTO;
        boolean op2Success = res2 instanceof OrderDTO;
        assertThat(op1Success || op2Success).isTrue();

        // Verify Invariants:
        // 1. Order MUST BE in SHIPPING status
        Order finalOrder = orderRepository.findById(readyOrderId).orElseThrow();
        assertThat(finalOrder.getOrderStatus()).isEqualTo("SHIPPING");

        // 2. Stock at Hà Nội MUST NOT be decremented twice!
        // Initial quantity=5, reserved=1. Exactly 1 unit deducted: final quantity=4, reserved=0.
        WarehouseStock stockHn = warehouseStockRepository.findByWarehouseIdAndPhoneVariantId(warehouseHnId, variantId).orElseThrow();
        assertThat(stockHn.getQuantity()).isEqualTo(4);
        assertThat(stockHn.getReservedQuantity()).isEqualTo(0);

        // 3. Stock history reference "FULFILL-ORDER-" + readyOrderId must exist EXACTLY ONCE
        long fulfillCount = warehouseStockHistoryRepository.findAll().stream()
                .filter(h -> ("FULFILL-ORDER-" + readyOrderId).equals(h.getTransferReference()))
                .count();
        assertThat(fulfillCount).isEqualTo(1);
    }
}
