package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.config.*;
import com.re.greenphone.dto.request.*;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class WarehouseInventoryIT extends MySQLTestContainer {
    @Autowired WarehouseInventoryService service;
    @Autowired InventoryStockHistoryService globalHistory;
    @Autowired WarehouseStockRepository stocks;
    @Autowired WarehouseStockHistoryRepository history;
    @Autowired PhoneVariantRepository variants;
    @Autowired WarehouseRepository warehouses;
    @Autowired OrderRepository orders;
    @Autowired OrderService orderService;
    @Autowired TransactionTemplate transactions;
    @Autowired EntityManager em;
    @MockitoBean DataInitializer dataInitializer;
    @MockitoBean SettingsService settings;
    @MockitoBean EmailService email;
    Long main, branch, variantId, userId;

    @BeforeEach
    void fixtures() {
        transactions.executeWithoutResult(status -> {
            // Unique warehouses shared across tests, with stock fixtures unique per variant.
            var existing = warehouses.findByCode("WH-HN-MAIN");
            Warehouse hn = existing.orElseGet(() -> warehouse("WH-HN-MAIN"));
            hn.setStatus("ACTIVE"); warehouses.save(hn); main = hn.getId();
            Warehouse dn = warehouses.findByCode("WH-DN-Q1").orElseGet(() -> warehouse("WH-DN-Q1"));
            dn.setStatus("ACTIVE"); warehouses.save(dn); branch = dn.getId();
            String suffix = UUID.randomUUID().toString();
            Brand brand = Brand.builder().name("Warehouse " + suffix).status("ACTIVE").build(); em.persist(brand);
            Phone phone = Phone.builder().name("Branch phone").brand(brand).status("ACTIVE").build(); em.persist(phone);
            PhoneVariant variant = PhoneVariant.builder().phone(phone).ramItem(option("RAM", "8GB"))
                    .storageItem(option("STORAGE", "128GB")).colorItem(option("COLOR", "Black"))
                    .stockQuantity(60).price(BigDecimal.TEN).sku(suffix).status("ACTIVE").build();
            em.persist(variant); em.flush(); variantId = variant.getId();
            Role role = em.createQuery("from Role where name='CUSTOMER'", Role.class).getResultStream().findFirst().orElseGet(() -> {
                Role created = new Role(); created.setName("CUSTOMER"); em.persist(created); return created;
            });
            User user = new User(); user.setFullName("Warehouse customer"); user.setEmail(suffix + "@example.com");
            user.setPassword("test"); user.setPhone(String.format("09%08d", variantId)); user.setRole(role); user.setStatus("ACTIVE"); em.persist(user); em.flush(); userId = user.getId();
        });
    }

    Warehouse warehouse(String code) {
        Warehouse warehouse = new Warehouse(); warehouse.setCode(code); warehouse.setName(code); warehouse.setAddress("Test address");
        return warehouses.saveAndFlush(warehouse);
    }
    OptionItem option(String type, String value) {
        return em.createQuery("from OptionItem i where i.option.type=:type and i.value=:value", OptionItem.class)
                .setParameter("type", type).setParameter("value", value).getResultStream().findFirst().orElseGet(() -> {
                    Option option = Option.builder().type(type).label(type).enabled(true).maxItems(5).sortOrder(1).build(); em.persist(option);
                    OptionItem item = OptionItem.builder().option(option).value(value).sortOrder(1).build(); em.persist(item); return item;
                });
    }
    int quantity(Long warehouse) {
        return stocks.findByWarehouseIdAndPhoneVariantId(warehouse, variantId).map(WarehouseStock::getQuantity).orElse(0);
    }
    void assertTotal(int expected) {
        assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(expected);
        assertThat(stocks.findByPhoneVariantId(variantId).stream().mapToInt(WarehouseStock::getQuantity).sum()).isEqualTo(expected);
    }

    @Test void importExportAndTransferKeepTotalsAndPairedHistory() {
        service.movement(branch, new WarehouseMovementRequest(variantId, "IMPORT", 5, "Delivery"));
        assertThat(quantity(main)).isEqualTo(60); assertThat(quantity(branch)).isEqualTo(5); assertTotal(65);
        service.movement(branch, new WarehouseMovementRequest(variantId, "EXPORT", 2, "Sale"));
        assertThat(quantity(branch)).isEqualTo(3); assertTotal(63);
        service.transfer(main, new WarehouseTransferRequest(variantId, branch, 10, "Rebalance"));
        assertThat(quantity(main)).isEqualTo(50); assertThat(quantity(branch)).isEqualTo(13); assertTotal(63);
        var outgoing = service.history(main, variantId).get(0);
        var incoming = service.history(branch, variantId).get(0);
        assertThat(outgoing.transferReference()).isNotBlank().isEqualTo(incoming.transferReference());
        assertThat(outgoing.quantityChange()).isEqualTo(-10); assertThat(incoming.quantityChange()).isEqualTo(10);
    }

    @Test void insufficientBranchAndInactiveDestinationRollbackEverything() {
        service.movement(branch, new WarehouseMovementRequest(variantId, "IMPORT", 2, "Delivery"));
        long before = history.count();
        assertThatThrownBy(() -> service.movement(branch, new WarehouseMovementRequest(variantId, "EXPORT", 3, "Too many")))
                .isInstanceOf(BadRequestException.class);
        assertTotal(62); assertThat(quantity(branch)).isEqualTo(2); assertThat(history.count()).isEqualTo(before);
        transactions.executeWithoutResult(status -> { var target = warehouses.findById(branch).orElseThrow(); target.setStatus("INACTIVE"); warehouses.save(target); });
        assertThatThrownBy(() -> service.transfer(main, new WarehouseTransferRequest(variantId, branch, 1, "Blocked"))).isInstanceOf(BadRequestException.class);
        assertTotal(62); assertThat(quantity(branch)).isEqualTo(2);
    }

    @Test void customerCancellationReturnsToOriginalInactiveWarehouseAndCannotRestoreTwice() {
        when(settings.getShippingFee()).thenReturn(BigDecimal.ZERO); when(settings.getFreeShippingThreshold()).thenReturn(BigDecimal.ZERO);
        try (var security = mockStatic(SecurityUtils.class)) {
            security.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            OrderItemRequest item = new OrderItemRequest(); item.setPhoneVariantId(variantId); item.setQuantity(2);
            OrderRequest request = new OrderRequest(); request.setReceiverName("Customer"); request.setReceiverPhone("0900000000");
            request.setShippingAddress("Ha Noi"); request.setPaymentMethod("COD"); request.setItems(List.of(item));
            Long id = orderService.createOrder(request).getId();
            assertTotal(58); assertThat(quantity(main)).isEqualTo(58);
            service.transfer(main, new WarehouseTransferRequest(variantId, branch, 10, "Rebalance"));
            transactions.executeWithoutResult(status -> {
                var order = orders.findById(id).orElseThrow();
                assertThat(order.getOrderDetails().get(0).getWarehouseId()).isEqualTo(main);
                var warehouse = warehouses.findById(main).orElseThrow(); warehouse.setStatus("INACTIVE"); warehouses.save(warehouse);
            });
            orderService.cancelOrder(id, "Changed mind");
            assertThat(quantity(main)).isEqualTo(50); assertThat(quantity(branch)).isEqualTo(10); assertTotal(60);
            assertThatThrownBy(() -> orderService.cancelOrder(id)).isInstanceOf(BadRequestException.class);
            assertTotal(60);
        }
    }

    @Test void concurrentExportsOfBranchLastUnitOnlyAllowOne() throws Exception {
        service.movement(branch, new WarehouseMovementRequest(variantId, "IMPORT", 1, "Last unit"));
        ExecutorService executor = Executors.newFixedThreadPool(4);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < 4; i++) results.add(executor.submit(() -> {
                start.await();
                try { service.movement(branch, new WarehouseMovementRequest(variantId, "EXPORT", 1, "Concurrent")); return true; }
                catch (BadRequestException expected) { return false; }
            }));
            start.countDown(); int successes = 0;
            for (var result : results) if (result.get(30, TimeUnit.SECONDS)) successes++;
            assertThat(successes).isEqualTo(1); assertThat(quantity(branch)).isZero(); assertTotal(60);
        } finally { start.countDown(); executor.shutdownNow(); }
    }
}
