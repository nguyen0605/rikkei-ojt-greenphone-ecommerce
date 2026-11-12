package com.re.greenphone.service.admin;
import com.re.greenphone.config.*;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.dto.request.PurchaseOrderRequest;
import com.re.greenphone.service.EmailService;
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

@SpringBootTest
class PurchaseOrderInventoryIT extends MySQLTestContainer {
    @Autowired AdminPurchaseOrderService service;
    @Autowired PurchaseOrderRepository orders;
    @Autowired SupplierRepository suppliers;
    @Autowired WarehouseRepository warehouses;
    @Autowired WarehouseStockRepository stocks;
    @Autowired PhoneVariantRepository variants;
    @Autowired InventoryStockHistoryRepository history;
    @Autowired TransactionTemplate tx;
    @Autowired EntityManager em;
    @MockitoBean DataInitializer initializer;
    @MockitoBean EmailService email;
    Long supplierId,mainId,branchId,variantId,secondId;
    @BeforeEach void fixture() {
        tx.executeWithoutResult(status -> {
            mainId=warehouse("WH-HN-MAIN").getId(); branchId=warehouse("WH-HCM-Q1").getId();
            Supplier supplier=new Supplier(); supplier.setCode("SUP-"+UUID.randomUUID()); supplier.setName("Digiworld test"); supplierId=suppliers.saveAndFlush(supplier).getId();
            Brand brand=Brand.builder().name(UUID.randomUUID().toString()).status("ACTIVE").build(); em.persist(brand);
            Phone phone=Phone.builder().name("Procurement phone").brand(brand).status("ACTIVE").build(); em.persist(phone);
            Phone second=Phone.builder().name("Overflow phone").brand(brand).status("ACTIVE").build(); em.persist(second);
            variantId=variant(phone,10).getId(); secondId=variant(second,Integer.MAX_VALUE).getId();
        });
    }
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
    @Test void receiveUpdatesHcmAndTotalExactlyOnce() {
        Long id=create(List.of(line(variantId,50))); service.receive(id);
        assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(60);
        assertThat(quantity(mainId)).isEqualTo(10); assertThat(quantity(branchId)).isEqualTo(50);
        assertThat(service.detail(id).status()).isEqualTo("RECEIVED"); assertThat(service.detail(id).items().get(0).quantityReceived()).isEqualTo(50);
        assertThat(history.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId)).hasSize(1);
        assertThatThrownBy(() -> service.receive(id)).isInstanceOf(RuntimeException.class);
        assertThat(quantity(branchId)).isEqualTo(50);
    }
    @Test void laterItemFailureRollsBackEntireReceipt() {
        Long id=create(List.of(line(variantId,50),line(secondId,1)));
        assertThatThrownBy(() -> service.receive(id)).isInstanceOf(RuntimeException.class);
        assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(10);
        assertThat(quantity(branchId)).isZero(); assertThat(service.detail(id).status()).isEqualTo("ORDERED");
        assertThat(service.detail(id).items()).allMatch(item -> item.quantityReceived()==0);
        assertThat(history.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId)).isEmpty();
    }
    @Test void concurrentReceiveSamePoOnlySucceedsOnce() throws Exception {
        Long id=create(List.of(line(variantId,50))); ExecutorService pool=Executors.newFixedThreadPool(2); CountDownLatch start=new CountDownLatch(1);
        try {
            Callable<Boolean> task=() -> { start.await(); try { service.receive(id); return true; } catch(com.re.greenphone.common.exception.BadRequestException ex) { return false; } };
            Future<Boolean> a=pool.submit(task), b=pool.submit(task); start.countDown();
            assertThat(List.of(a.get(45,TimeUnit.SECONDS),b.get(45,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
            assertThat(quantity(branchId)).isEqualTo(50); assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(60);
            assertThat(history.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId)).hasSize(1);
        } finally { pool.shutdownNow(); }
    }
    @Test void differentPosOnSameVariantDoNotLoseStock() throws Exception {
        Long first=create(List.of(line(variantId,20))), second=create(List.of(line(variantId,30)));
        ExecutorService pool=Executors.newFixedThreadPool(2); CountDownLatch start=new CountDownLatch(1);
        try {
            Future<?> a=pool.submit(() -> { await(start); service.receive(first); }); Future<?> b=pool.submit(() -> { await(start); service.receive(second); }); start.countDown();
            a.get(45,TimeUnit.SECONDS); b.get(45,TimeUnit.SECONDS);
            assertThat(quantity(branchId)).isEqualTo(50); assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(60);
            assertThat(history.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId)).hasSize(2);
        } finally { pool.shutdownNow(); }
    }
    void await(CountDownLatch start) { try { start.await(); } catch(InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); } }
    @Test void draftEditRemovesOldItemsAndReceiptUsesOnlyUpdatedQuantities() {
        Long id=service.create(new PurchaseOrderRequest(supplierId,branchId,"DRAFT",null,List.of(line(variantId,50),line(secondId,1)))).id();
        service.update(id,new PurchaseOrderRequest(supplierId,branchId,"DRAFT","Changed",List.of(line(variantId,3))));
        assertThat(service.detail(id).items()).hasSize(1); assertThat(service.detail(id).totalCost()).isEqualByComparingTo("30");
        Long persisted=tx.execute(status -> em.createQuery("select count(i) from PurchaseOrderItem i where i.purchaseOrder.id=:id",Long.class).setParameter("id",id).getSingleResult());
        assertThat(persisted).isEqualTo(1); assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(10);
        service.order(id); service.receive(id); assertThat(quantity(branchId)).isEqualTo(3);
        assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isEqualTo(13);
    }
    @Test void filtersAndSortsAcrossTheCompleteOrderList() {
        Long small=create(List.of(line(variantId,2))), large=create(List.of(line(variantId,5)));
        var result=service.filter("ORDERED",0,1,"",supplierId,branchId,"COST_DESC");
        assertThat(result.getTotalElements()).isEqualTo(2); assertThat(result.getContent().get(0).id()).isEqualTo(large);
        assertThat(service.filter("ORDERED",1,1,"",supplierId,branchId,"COST_DESC").getContent().get(0).id()).isEqualTo(small);
        String number=service.detail(small).poNumber();
        assertThat(service.filter(null,0,10,number,supplierId,branchId,"NEWEST").getTotalElements()).isEqualTo(1);
        assertThat(service.filter("RECEIVED",0,10,"",supplierId,branchId,"NEWEST").getTotalElements()).isZero();
    }
}
