package com.re.greenphone.service.admin;

import com.re.greenphone.config.MySQLTestContainer;
import com.re.greenphone.config.DataInitializer;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.entity.*;
import com.re.greenphone.service.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

/** Runs against an isolated disposable MySQL; never writes to the local demo database. */
@SpringBootTest
@Transactional
class LowStockFilterIT extends MySQLTestContainer {
    @Autowired AdminPhoneService service;
    @Autowired EntityManager em;
    @MockitoBean DataInitializer initializer;
    @MockitoBean SettingsService settings;
    @MockitoBean EmailService email;
    Warehouse a, b, inactive;
    Brand brand;
    OptionItem ram, storage, color;
    Phone mixed, normal, empty, legacy;
    PhoneVariant low, healthy;

    @BeforeEach void fixtures() {
        String suffix = UUID.randomUUID().toString();
        brand = Brand.builder().name(suffix).status("ACTIVE").build(); em.persist(brand);
        ram = option("RAM"); storage = option("STORAGE"); color = option("COLOR");
        a = warehouse("A" + suffix, "ACTIVE"); b = warehouse("B" + suffix, "ACTIVE");
        inactive = warehouse("I" + suffix, "INACTIVE");
        mixed = phone("Mixed"); normal = phone("Normal"); empty = phone("Empty"); legacy = phone("Legacy");
        low = variant(mixed, 22); healthy = variant(mixed, 27);
        stock(a, low, 2); stock(b, low, 20);
        stock(a, healthy, 15); stock(b, healthy, 12);
        PhoneVariant normalVariant = variant(normal, 40);
        stock(a, normalVariant, 20); stock(b, normalVariant, 20); stock(inactive, normalVariant, 1);
        stock(a, variant(empty, 0), 0);
        variant(legacy, 1); // Aggregate alone must never satisfy a branch filter.
        em.flush();
    }

    @Test void allBranches_filtersBeforePagination_andCountsDistinctMatchingVariants() {
        var page = request(); page.setSize(1);
        var result = service.getPhones(null, brand.getId(), "ACTIVE", true, null, page);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).singleElement().satisfies(dto -> {
            assertThat(dto.getId()).isEqualTo(mixed.getId());
            assertThat(dto.getVariantCount()).isEqualTo(1);
        });
        var variants = service.getVariants(mixed.getId(), true, null);
        assertThat(variants).singleElement().satisfies(dto -> {
            assertThat(dto.getId()).isEqualTo(low.getId());
            assertThat(dto.getWarehouseStocks()).singleElement().satisfies(row -> {
                assertThat(row.warehouseId()).isEqualTo(a.getId());
                assertThat(row.quantity()).isEqualTo(2);
            });
        });
    }

    @Test void selectedBranch_searchBrandStatusAndToggle_matchSameScope() {
        assertThat(service.getPhones("Mixed", brand.getId(), "ACTIVE", true, a.getId(), request()).getTotalElements()).isEqualTo(1);
        assertThat(service.getPhones(null, brand.getId(), "ACTIVE", true, b.getId(), request()).getTotalElements()).isZero();
        assertThat(service.getPhones("Normal", brand.getId(), "ACTIVE", true, null, request()).getTotalElements()).isZero();
        assertThat(service.getPhones(null, brand.getId(), "INACTIVE", true, null, request()).getTotalElements()).isZero();
        assertThat(service.getVariants(mixed.getId(), true, b.getId())).isEmpty();
        assertThat(service.getVariants(mixed.getId(), false, null)).hasSize(2);
        assertThat(service.getPhones(null, brand.getId(), "ACTIVE", false, null, request()).getTotalElements()).isEqualTo(4);
    }

    @Test void thresholdBoundary_zeroAndAboveThresholdAreExcluded() {
        stock(a, variant(phone("Boundary"), 5), AdminPhoneService.LOW_STOCK_THRESHOLD);
        stock(a, variant(phone("Above"), 6), AdminPhoneService.LOW_STOCK_THRESHOLD + 1);
        em.flush();
        assertThat(service.getPhones(null, brand.getId(), "ACTIVE", true, a.getId(), request()).getContent())
                .extracting(dto -> dto.getName()).containsExactlyInAnyOrder("Mixed", "Boundary");
    }

    @Test void sameVariantLowInTwoBranches_isCountedOnce_withoutSummingQuantities() {
        em.createQuery("update WarehouseStock s set s.quantity=4 where s.phoneVariant=:variant")
                .setParameter("variant", low).executeUpdate();
        em.flush(); em.clear();
        var result = service.getPhones("Mixed", brand.getId(), "ACTIVE", true, null, request());
        assertThat(result.getContent()).singleElement().satisfies(dto -> assertThat(dto.getVariantCount()).isEqualTo(1));
        assertThat(service.getVariants(mixed.getId(), true, null)).singleElement().satisfies(dto -> {
            assertThat(dto.getWarehouseStocks()).hasSize(2);
            assertThat(dto.getWarehouseStocks()).allSatisfy(row -> assertThat(row.quantity()).isEqualTo(4));
        });
    }

    PageRequest request() { var p = new PageRequest(); p.setPage(0); p.setSize(20); p.setSortBy("id"); p.setSortDir("asc"); return p; }
    Warehouse warehouse(String code, String status) { var w = new Warehouse(); w.setCode(code); w.setName(code); w.setAddress("Test"); w.setStatus(status); em.persist(w); return w; }
    Phone phone(String name) { var p = Phone.builder().brand(brand).name(name).status("ACTIVE").build(); em.persist(p); return p; }
    OptionItem option(String type) {
        var o = Option.builder().type(type + UUID.randomUUID().toString().substring(0, 5)).label(type).enabled(true).sortOrder(1).maxItems(10).build(); em.persist(o);
        var i = OptionItem.builder().option(o).value(type).sortOrder(1).build(); em.persist(i); return i;
    }
    PhoneVariant variant(Phone phone, int quantity) {
        // Unique color avoids the per-phone option combination constraint.
        var v = PhoneVariant.builder().phone(phone).ramItem(ram).storageItem(storage).colorItem(option("COLOR"))
                .price(BigDecimal.TEN).stockQuantity(quantity).sku(UUID.randomUUID().toString()).build();
        em.persist(v); phone.getVariants().add(v); return v;
    }
    void stock(Warehouse w, PhoneVariant v, int quantity) { var s = new WarehouseStock(); s.setWarehouse(w); s.setPhoneVariant(v); s.setQuantity(quantity); em.persist(s); }
}
