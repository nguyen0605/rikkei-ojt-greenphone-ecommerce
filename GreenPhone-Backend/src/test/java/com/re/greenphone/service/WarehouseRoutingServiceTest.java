package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.entity.WarehouseStock;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.WarehouseRepository;
import com.re.greenphone.repository.WarehouseStockRepository;
import com.re.greenphone.service.impl.WarehouseRoutingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarehouseRoutingServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private WarehouseStockRepository warehouseStockRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @InjectMocks
    private WarehouseRoutingServiceImpl routingService;

    private Warehouse warehouseHn;
    private Warehouse warehouseHcm;

    private static final double HN_LAT = 21.02850000;
    private static final double HN_LNG = 105.85420000;

    private static final double HCM_LAT = 10.77690000;
    private static final double HCM_LNG = 106.70090000;

    @BeforeEach
    void setUp() {
        warehouseHn = new Warehouse();
        warehouseHn.setId(1L);
        warehouseHn.setCode("WH-HN-MAIN");
        warehouseHn.setName("Kho Tổng Hà Nội");
        warehouseHn.setAddress("Tòa nhà FPT, Cầu Giấy, Hà Nội");
        warehouseHn.setLatitude(BigDecimal.valueOf(HN_LAT));
        warehouseHn.setLongitude(BigDecimal.valueOf(HN_LNG));
        warehouseHn.setStatus("ACTIVE");

        warehouseHcm = new Warehouse();
        warehouseHcm.setId(2L);
        warehouseHcm.setCode("WH-HCM-Q1");
        warehouseHcm.setName("Kho Chi Nhánh TP.HCM");
        warehouseHcm.setAddress("Quận 1, TP. Hồ Chí Minh");
        warehouseHcm.setLatitude(BigDecimal.valueOf(HCM_LAT));
        warehouseHcm.setLongitude(BigDecimal.valueOf(HCM_LNG));
        warehouseHcm.setStatus("ACTIVE");
    }

    private WarehouseStock createStock(Warehouse w, Long variantId, int qty) {
        WarehouseStock ws = new WarehouseStock();
        ws.setWarehouse(w);
        PhoneVariant pv = new PhoneVariant();
        pv.setId(variantId);
        ws.setPhoneVariant(pv);
        ws.setQuantity(qty);
        return ws;
    }

    @Test
    @DisplayName("1. Khách tại TP.HCM chọn kho TP.HCM khi đủ hàng")
    void customerInHcm_selectsHcmWarehouse_whenStockSufficient() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 5),
                createStock(warehouseHn, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Customer in District 1, HCMC
        Warehouse selected = routingService.routeWarehouseForOrder(
                HCM_LAT, HCM_LNG,
                List.of(new OrderItemRequirement(variantId, 2))
        );

        assertNotNull(selected);
        assertEquals("WH-HCM-Q1", selected.getCode());
        assertEquals(2L, selected.getId());
    }

    @Test
    @DisplayName("2. Khách tại Hà Nội chọn kho Hà Nội khi đủ hàng")
    void customerInHanoi_selectsHanoiWarehouse_whenStockSufficient() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 5),
                createStock(warehouseHn, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Customer in Hanoi
        Warehouse selected = routingService.routeWarehouseForOrder(
                HN_LAT, HN_LNG,
                List.of(new OrderItemRequirement(variantId, 2))
        );

        assertNotNull(selected);
        assertEquals("WH-HN-MAIN", selected.getCode());
        assertEquals(1L, selected.getId());
    }

    @Test
    @DisplayName("3. Kho gần nhất thiếu 1 biến thể -> tự động chọn kho xa hơn đủ toàn bộ giỏ")
    void nearestWarehouseMissingOneVariant_cascadesToFurtherWarehouse() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variant1 = 101L;
        Long variant2 = 102L;

        // HCM (nearest to customer) only has variant1, missing variant2 (stock 0)
        // HN has both variant1 and variant2
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variant1, 5),
                createStock(warehouseHcm, variant2, 0),
                createStock(warehouseHn, variant1, 10),
                createStock(warehouseHn, variant2, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Customer in HCMC
        Warehouse selected = routingService.routeWarehouseForOrder(
                HCM_LAT, HCM_LNG,
                List.of(new OrderItemRequirement(variant1, 1), new OrderItemRequirement(variant2, 1))
        );

        assertNotNull(selected);
        assertEquals("WH-HN-MAIN", selected.getCode(), "Should cascade to WH-HN-MAIN because HCM warehouse is missing variant2");
    }

    @Test
    @DisplayName("4. Kho gần nhất có hàng nhưng số lượng < số lượng đặt mua -> cascade kho tiếp theo")
    void nearestWarehouseHasVariantButInsufficientQuantity_cascades() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        // Customer orders 5 units. HCM only has 3 units. HN has 10 units.
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 3),
                createStock(warehouseHn, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        Warehouse selected = routingService.routeWarehouseForOrder(
                HCM_LAT, HCM_LNG,
                List.of(new OrderItemRequirement(variantId, 5))
        );

        assertNotNull(selected);
        assertEquals("WH-HN-MAIN", selected.getCode(), "Should cascade to WH-HN-MAIN because HCM stock (3) < requested (5)");
    }

    @Test
    @DisplayName("5. Không có kho nào đủ hàng -> ném BadRequestException")
    void noWarehouseHasSufficientStock_throwsBadRequestException() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        // Customer orders 15 units. HCM has 3, HN has 10. Neither can fulfill 15.
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 3),
                createStock(warehouseHn, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                routingService.routeWarehouseForOrder(
                        HCM_LAT, HCM_LNG,
                        List.of(new OrderItemRequirement(variantId, 15))
                )
        );

        assertTrue(ex.getMessage().contains("Không có kho nào có đủ tồn kho"));
    }

    @Test
    @DisplayName("6. Không có tọa độ -> fallback kho mặc định WH-HN-MAIN")
    void nullCoordinates_fallbacksToDefaultWarehouse() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHn, variantId, 10),
                createStock(warehouseHcm, variantId, 5)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        Warehouse selected = routingService.routeWarehouseForOrder(
                null, null,
                List.of(new OrderItemRequirement(variantId, 2))
        );

        assertNotNull(selected);
        assertEquals("WH-HN-MAIN", selected.getCode());
    }

    @Test
    @DisplayName("7. Không có tọa độ và kho mặc định không đủ hàng -> fallback kho khác")
    void nullCoordinates_defaultWarehouseInsufficientStock_cascadesToOtherActiveWarehouse() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        // HN has 0, HCM has 10
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHn, variantId, 0),
                createStock(warehouseHcm, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        Warehouse selected = routingService.routeWarehouseForOrder(
                null, null,
                List.of(new OrderItemRequirement(variantId, 2))
        );

        assertNotNull(selected);
        assertEquals("WH-HCM-Q1", selected.getCode(), "Should fallback to HCM warehouse when default HN is out of stock");
    }

    @Test
    @DisplayName("8. Kho INACTIVE không được chọn")
    void inactiveWarehouse_isStrictlyIgnored() {
        // Warehouse repository only returns ACTIVE warehouses; INACTIVE warehouses are excluded by query
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHcm));

        Long variantId = 101L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Customer in Hanoi, but Hanoi warehouse is INACTIVE (not in ACTIVE list)
        Warehouse selected = routingService.routeWarehouseForOrder(
                HN_LAT, HN_LNG,
                List.of(new OrderItemRequirement(variantId, 1))
        );

        assertNotNull(selected);
        assertEquals("WH-HCM-Q1", selected.getCode());
    }

    @Test
    @DisplayName("9. Tọa độ không hợp lệ -> ném BadRequestException hoặc IllegalArgumentException")
    void invalidCoordinates_throwsException() {
        // Lat > 90
        assertThrows(BadRequestException.class, () ->
                routingService.routeWarehouseForOrder(95.0, 105.0, List.of(new OrderItemRequirement(1L, 1)))
        );

        // Lng < -180
        assertThrows(BadRequestException.class, () ->
                routingService.routeWarehouseForOrder(21.0, -185.0, List.of(new OrderItemRequirement(1L, 1)))
        );

        // NaN
        assertThrows(BadRequestException.class, () ->
                routingService.routeWarehouseForOrder(Double.NaN, 105.0, List.of(new OrderItemRequirement(1L, 1)))
        );

        // Infinity in calculateDistance
        assertThrows(IllegalArgumentException.class, () ->
                routingService.calculateDistance(Double.POSITIVE_INFINITY, 105.0, 21.0, 105.0)
        );
    }

    @Test
    @DisplayName("10. Nhiều sản phẩm trong một đơn hàng (Multi-item cart)")
    void multiItemCart_routesCorrectly() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long v1 = 1L, v2 = 2L, v3 = 3L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, v1, 5),
                createStock(warehouseHcm, v2, 5),
                createStock(warehouseHcm, v3, 5),
                createStock(warehouseHn, v1, 10),
                createStock(warehouseHn, v2, 10),
                createStock(warehouseHn, v3, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Customer in HCM orders 3 items
        Warehouse selected = routingService.routeWarehouseForOrder(
                HCM_LAT, HCM_LNG,
                List.of(
                        new OrderItemRequirement(v1, 2),
                        new OrderItemRequirement(v2, 1),
                        new OrderItemRequirement(v3, 3)
                )
        );

        assertNotNull(selected);
        assertEquals("WH-HCM-Q1", selected.getCode());
    }

    @Test
    @DisplayName("11. Hai request đồng thời tranh chấp tồn kho -> mô phỏng định tuyến luân phiên an toàn")
    void concurrentRequestsSimulation() throws InterruptedException, ExecutionException {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 200L;
        AtomicInteger hcmStock = new AtomicInteger(1); // Only 1 unit in HCM
        int hnStock = 10;                              // 10 units in HN

        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenAnswer(inv -> List.of(
                        createStock(warehouseHcm, variantId, hcmStock.get()),
                        createStock(warehouseHn, variantId, hnStock)
                ));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        List<String> routedWarehouses = new CopyOnWriteArrayList<>();

        Callable<Void> task = () -> {
            synchronized (this) {
                Warehouse w = routingService.routeWarehouseForOrder(
                        HCM_LAT, HCM_LNG,
                        List.of(new OrderItemRequirement(variantId, 1))
                );
                routedWarehouses.add(w.getCode());
                if ("WH-HCM-Q1".equals(w.getCode())) {
                    hcmStock.decrementAndGet(); // Consumed HCM stock
                }
            }
            return null;
        };

        Future<Void> f1 = executor.submit(task);
        Future<Void> f2 = executor.submit(task);

        f1.get();
        f2.get();
        executor.shutdown();

        assertEquals(2, routedWarehouses.size());
        assertTrue(routedWarehouses.contains("WH-HCM-Q1"), "First order took WH-HCM-Q1");
        assertTrue(routedWarehouses.contains("WH-HN-MAIN"), "Second order cascaded to WH-HN-MAIN");
    }

    @Test
    @DisplayName("12. Tính đúng Haversine với dữ liệu tham chiếu")
    void haversineReferenceCalculation_exactPrecision() {
        // Reference distance between Hanoi (21.0285, 105.8542) and HCMC (10.7769, 106.7009)
        // Calculated great-circle distance is approx 1143.50 km
        double distance = routingService.calculateDistance(HN_LAT, HN_LNG, HCM_LAT, HCM_LNG);
        assertEquals(1143.50, distance, 0.5, "Distance between Hanoi and HCMC must be approx 1143.50 km");

        // Distance from a point to itself must be 0.0
        double zeroDist = routingService.calculateDistance(HN_LAT, HN_LNG, HN_LAT, HN_LNG);
        assertEquals(0.0, zeroDist, 0.001);

        // Distance between HCMC District 1 (10.7769, 106.7009) and Thu Duc (10.8400, 106.8300)
        double hcmToThuDuc = routingService.calculateDistance(HCM_LAT, HCM_LNG, 10.8400, 106.8300);
        assertEquals(15.75, hcmToThuDuc, 0.5, "Distance between HCMC D1 and Thu Duc should be ~15.75 km");
    }

    @Test
    @DisplayName("Benchmark hiệu năng định tuyến kho dưới 50ms")
    void benchmarkRoutingPerformance_sub50ms() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        Long variantId = 101L;
        List<WarehouseStock> stockRecords = List.of(
                createStock(warehouseHcm, variantId, 10),
                createStock(warehouseHn, variantId, 10)
        );
        when(warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(anyCollection(), anyCollection()))
                .thenReturn(stockRecords);

        // Warm up JIT
        for (int i = 0; i < 50; i++) {
            routingService.routeWarehouseForOrder(HCM_LAT, HCM_LNG, List.of(new OrderItemRequirement(variantId, 1)));
        }

        // Measure 100 iterations
        long start = System.nanoTime();
        int iterations = 100;
        for (int i = 0; i < iterations; i++) {
            Warehouse w = routingService.routeWarehouseForOrder(HCM_LAT, HCM_LNG, List.of(new OrderItemRequirement(variantId, 1)));
            assertNotNull(w);
        }
        long durationNs = System.nanoTime() - start;
        double avgMs = (durationNs / 1_000_000.0) / iterations;

        System.out.printf("Routing Engine Benchmark: Avg execution time per route: %.4f ms (Threshold: 50.0 ms)%n", avgMs);
        assertTrue(avgMs < 50.0, "Routing must execute well under 50ms. Actual: " + avgMs + " ms");
    }

    @Test
    @DisplayName("findNearestWarehouse: Tra cứu kho công khai")
    void findNearestWarehouse_publicLookup() {
        when(warehouseRepository.findByStatus("ACTIVE")).thenReturn(List.of(warehouseHn, warehouseHcm));

        // Public lookup near HCMC
        NearestWarehouseResponse respHcm = routingService.findNearestWarehouse(HCM_LAT, HCM_LNG);
        assertNotNull(respHcm);
        assertEquals("WH-HCM-Q1", respHcm.getCode());
        assertEquals(0.0, respHcm.getDistanceKm(), 0.01);

        // Public lookup null coordinates -> default WH-HN-MAIN with distance null
        NearestWarehouseResponse respNull = routingService.findNearestWarehouse(null, null);
        assertNotNull(respNull);
        assertEquals("WH-HN-MAIN", respNull.getCode());
        assertNull(respNull.getDistanceKm());
    }
}

