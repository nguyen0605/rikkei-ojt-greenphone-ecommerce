package com.re.greenphone.service.admin;
import com.re.greenphone.config.*;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.dto.request.PurchaseOrderRequest;
import com.re.greenphone.service.EmailService;
import com.re.greenphone.service.OrderCostService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest
class FinancialReportIT extends MySQLTestContainer {
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired AdminStatisticsService statistics;
    @Autowired AdminPurchaseOrderService service;
    @Autowired OrderCostService costs;
    @Autowired WarehouseRepository warehouses;
    @Autowired WarehouseStockRepository stocks;
    @MockitoBean DataInitializer initializer;
    @MockitoBean EmailService email;
    Long supplierId,branchId,variantId;
    Warehouse warehouse(String code) {
        return warehouses.findByCode(code).orElseGet(() -> { Warehouse w=new Warehouse(); w.setCode(code); w.setName(code); w.setAddress("Test"); return warehouses.saveAndFlush(w); });
    }
    OptionItem option(String type) {
        return em.createQuery("from OptionItem i where i.option.type=:type and i.value='PO'",OptionItem.class).setParameter("type",type).getResultStream().findFirst().orElseGet(() -> {
            Option option=Option.builder().type(type).label(type).enabled(true).maxItems(10).sortOrder(1).build(); em.persist(option);
            OptionItem item=OptionItem.builder().option(option).value("PO").sortOrder(1).build(); em.persist(item); return item;
        });
    }
    PhoneVariant variant(Phone phone,int stock) {
        PhoneVariant variant=PhoneVariant.builder().phone(phone).sku(UUID.randomUUID().toString()).status("ACTIVE").stockQuantity(stock).price(BigDecimal.TEN)
            .ramItem(option("RAM")).storageItem(option("STORAGE")).colorItem(option("COLOR")).build();
        em.persist(variant); em.flush(); return variant;
    }
    Long create(List<PurchaseOrderRequest.Item> items) {
        return service.create(new PurchaseOrderRequest(supplierId,branchId,"ORDERED",null,items)).id();
    }
    PurchaseOrderRequest.Item line(Long variant,int quantity) { return new PurchaseOrderRequest.Item(variant,quantity,BigDecimal.TEN); }
    int quantity(Long warehouse) { return stocks.findByWarehouseIdAndPhoneVariantId(warehouse,variantId).map(WarehouseStock::getQuantity).orElse(0); }

    @Test void realQueriesExcludeUnpaidAndFailedPreserveCostAndGroupVietnamMidnight() {
        tx.executeWithoutResult(status -> {
            branchId=warehouse("WH-HN-MAIN").getId();
            Supplier supplier=new Supplier(); supplier.setCode("TEST"+UUID.randomUUID()); supplier.setName("Supplier"); em.persist(supplier); supplierId=supplier.getId();
            Brand brand=Brand.builder().name("Report"+UUID.randomUUID()).status("ACTIVE").build(); em.persist(brand);
            Phone phone=Phone.builder().name("Report phone").brand(brand).status("ACTIVE").build(); em.persist(phone);
            variantId=variant(phone,0).getId();
            var po=service.create(new PurchaseOrderRequest(supplierId,branchId,"ORDERED",null,List.of(new PurchaseOrderRequest.Item(variantId,2,new BigDecimal("20")))));
            service.receive(po.id());
            var po2=service.create(new PurchaseOrderRequest(supplierId,branchId,"ORDERED",null,List.of(new PurchaseOrderRequest.Item(variantId,1,new BigDecimal("50")))));
            service.receive(po2.id());
            assertThat(costs.snapshot(variantId)).isEqualByComparingTo("30");
            Role role=Role.builder().name("TEST_ROLE").build(); em.persist(role);
            User user=new User(); user.setRole(role); user.setEmail("report@test.vn"); user.setFullName("Report"); user.setPhone("0900000000"); user.setPassword("test"); em.persist(user);
            for (String payment : List.of("PAID","UNPAID","FAILED")) {
                Order order=Order.builder().user(user).receiverName("Test").receiverPhone("0900000000").shippingAddress("Test")
                    .totalAmount(new BigDecimal("200")).discountAmount(new BigDecimal("20")).shippingFee(new BigDecimal("10")).finalAmount(new BigDecimal("190"))
                    .paymentStatus(payment).paymentMethod("VIETQR").build(); em.persist(order);
                // Two details prove the order-level revenue query cannot multiply revenue.
                for(int i=0;i<2;i++) { OrderDetail detail=OrderDetail.builder().order(order).phoneVariant(em.find(PhoneVariant.class,variantId))
                    .productName("Report").ram("8").storage("128").color("Green").quantity(1).unitPrice(new BigDecimal("100")).subtotal(new BigDecimal("100")).unitCost(costs.snapshot(variantId)).build(); em.persist(detail); }
                em.flush(); em.createQuery("update Order o set o.createdAt=:time where o.id=:id").setParameter("time",LocalDateTime.of(2026,11,1,18,0)).setParameter("id",order.getId()).executeUpdate();
            }
            em.flush(); em.clear();
            var report=statistics.getFinancialReport("month",LocalDateTime.of(2026,10,31,17,0),LocalDateTime.of(2026,11,2,17,0));
            assertThat(report.grossRevenue()).isEqualByComparingTo("200"); assertThat(report.netRevenue()).isEqualByComparingTo("180");
            assertThat(report.cogs()).isEqualByComparingTo("60"); assertThat(report.grossProfit()).isEqualByComparingTo("120");
            assertThat(report.paymentMethodStats()).hasSize(1); assertThat(report.paymentMethodStats().get(0).revenue()).isEqualByComparingTo("180");
            assertThat(report.timeSeriesData().get(0).revenue()).isZero(); assertThat(report.timeSeriesData().get(1).date()).isEqualTo("2026-11-02");
            assertThat(report.timeSeriesData().get(1).revenue()).isEqualByComparingTo("180");
            var po3=service.create(new PurchaseOrderRequest(supplierId,branchId,"ORDERED",null,List.of(new PurchaseOrderRequest.Item(variantId,1,new BigDecimal("90"))))); service.receive(po3.id());
            assertThat(costs.snapshot(variantId)).isEqualByComparingTo("45");
            assertThat(statistics.getFinancialReport("month",LocalDateTime.of(2026,10,31,17,0),LocalDateTime.of(2026,11,2,17,0)).cogs()).isEqualByComparingTo("60");
            em.createNativeQuery("SET SESSION cte_max_recursion_depth=10001").executeUpdate();
            em.createNativeQuery("""
                INSERT INTO orders (user_id,receiver_name,receiver_phone,shipping_address,total_amount,discount_amount,shipping_fee,final_amount,order_status,payment_status,payment_method,version,created_at,updated_at)
                WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<10000)
                SELECT :userId,'BENCH','0900000000','Test',100,0,0,100,'DELIVERED','PAID',
                    CASE MOD(n,3) WHEN 0 THEN 'COD' WHEN 1 THEN 'VIETQR' ELSE 'VNPAY' END,0,
                    DATE_ADD('2026-01-01', INTERVAL MOD(n,365) DAY),'2026-01-01' FROM seq
                """).setParameter("userId",user.getId()).executeUpdate();
            em.createNativeQuery("""
                INSERT INTO order_detail (order_id,phone_variant_id,product_name,ram,storage,color,unit_price,quantity,subtotal,unit_cost,created_at,updated_at)
                SELECT id,:variant,'Benchmark','8','128','Green',100,1,100,30,created_at,created_at FROM orders WHERE receiver_name='BENCH'
                """).setParameter("variant",variantId).executeUpdate();
            var yearStart=LocalDateTime.of(2025,12,31,17,0); var yearEnd=yearStart.plusYears(1);
            statistics.getFinancialReport("year",yearStart,yearEnd); // Warm JVM/connection metadata.
            long started=System.nanoTime(); var annual=statistics.getFinancialReport("year",yearStart,yearEnd);
            long millis=(System.nanoTime()-started)/1_000_000;
            System.out.println("FINANCIAL_REPORT_BENCHMARK orders=10003 details=10006 range=365days elapsedMs="+millis);
            assertThat(annual.timeSeriesData()).hasSize(365);
            assertThat(millis).as("One-year report over 10003 orders, warm local MySQL").isLessThan(1500);

        });
    }
}
