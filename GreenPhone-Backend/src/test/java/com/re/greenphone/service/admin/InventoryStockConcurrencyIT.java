package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.config.DataInitializer;
import com.re.greenphone.config.MySQLTestContainer;
import com.re.greenphone.dto.request.InventoryStockMovementRequest;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.InventoryStockHistoryRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class InventoryStockConcurrencyIT extends MySQLTestContainer {
    @Autowired private InventoryStockHistoryService service;
    @Autowired private PhoneVariantRepository variants;
    @Autowired private InventoryStockHistoryRepository history;
    @Autowired private TransactionTemplate transactions;
    @Autowired private EntityManager em;
    @MockitoBean private DataInitializer dataInitializer;

    @Test
    void concurrentExportsOfLastUnitAllowExactlyOneAndRecordOneMovement() throws Exception {
        Long variantId = transactions.execute(status -> {
            Brand brand = Brand.builder().name("Concurrency test").status("ACTIVE").build();
            em.persist(brand);
            Phone phone = Phone.builder().name("Last unit").brand(brand).status("ACTIVE").build();
            em.persist(phone);
            PhoneVariant variant = PhoneVariant.builder().phone(phone)
                    .ramItem(option("RAM", "8GB")).storageItem(option("STORAGE", "128GB"))
                    .colorItem(option("COLOR", "Black")).price(BigDecimal.TEN)
                    .stockQuantity(1).sku("CONCURRENT-LAST-UNIT").status("ACTIVE").build();
            em.persist(variant);
            em.flush();
            return variant.getId();
        });

        int workers = 5;
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        try {
            for (int i = 0; i < workers; i++) {
                results.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new TimeoutException("Start barrier timed out");
                    try {
                        service.applyMovement(variantId, new InventoryStockMovementRequest("EXPORT", 1, "Concurrent export"));
                        return true;
                    } catch (BadRequestException expected) {
                        return false;
                    }
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            int successes = 0;
            for (Future<Boolean> result : results) {
                if (result.get(30, TimeUnit.SECONDS)) successes++;
            }
            assertThat(successes).isEqualTo(1);
            assertThat(variants.findById(variantId).orElseThrow().getStockQuantity()).isZero();
            assertThat(history.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId))
                    .singleElement().satisfies(movement -> {
                        assertThat(movement.getQuantityBefore()).isEqualTo(1);
                        assertThat(movement.getQuantityChange()).isEqualTo(-1);
                        assertThat(movement.getQuantityAfter()).isZero();
                        assertThat(movement.getChangeType()).isEqualTo("EXPORT");
                    });
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private OptionItem option(String type, String value) {
        Option option = Option.builder().type(type).label(type).enabled(true).maxItems(5).sortOrder(1).build();
        em.persist(option);
        OptionItem item = OptionItem.builder().option(option).value(value).sortOrder(1).build();
        em.persist(item);
        return item;
    }
}
