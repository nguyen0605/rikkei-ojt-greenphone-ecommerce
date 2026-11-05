package com.re.greenphone.controller;

import com.re.greenphone.config.BaseIntegrationTest;
import com.re.greenphone.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for the /api/phones endpoints.
 * Requires Docker for Testcontainers MySQL.
 */
@AutoConfigureMockMvc
class PhoneControllerIT extends BaseIntegrationTest {

    @Autowired
    private MockMvc mvc;

    private Phone testPhone;
    private PhoneVariant testVariant;

    @BeforeEach
    void setUp() {
        // Create brand
        Brand brand = Brand.builder().name("Apple").status("ACTIVE").build();
        em.persist(brand);

        // Create phone
        testPhone = Phone.builder()
                .brand(brand)
                .name("iPhone 15 Pro")
                .description("Latest iPhone")
                .screen("6.1 inch OLED")
                .os("iOS 17")
                .chip("A17 Pro")
                .rearCamera("48MP")
                .frontCamera("12MP")
                .battery("3274mAh")
                .status("ACTIVE")
                .build();
        em.persist(testPhone);

        // Create option categories + items, then variant with FKs
        com.re.greenphone.entity.Option ramOpt = com.re.greenphone.entity.Option.builder()
                .type("RAM").label("RAM").enabled(true).maxItems(5).sortOrder(1).build();
        em.persist(ramOpt);
        com.re.greenphone.entity.Option storageOpt = com.re.greenphone.entity.Option.builder()
                .type("STORAGE").label("Dung lượng").enabled(true).maxItems(5).sortOrder(2).build();
        em.persist(storageOpt);
        com.re.greenphone.entity.Option colorOpt = com.re.greenphone.entity.Option.builder()
                .type("COLOR").label("Màu sắc").enabled(true).maxItems(5).sortOrder(3).build();
        em.persist(colorOpt);
        com.re.greenphone.entity.OptionItem ramItem = com.re.greenphone.entity.OptionItem.builder()
                .option(ramOpt).value("8GB").sortOrder(1).build();
        em.persist(ramItem);
        com.re.greenphone.entity.OptionItem storageItem = com.re.greenphone.entity.OptionItem.builder()
                .option(storageOpt).value("256GB").sortOrder(1).build();
        em.persist(storageItem);
        com.re.greenphone.entity.OptionItem colorItem = com.re.greenphone.entity.OptionItem.builder()
                .option(colorOpt).value("Natural Titanium").sortOrder(1).build();
        em.persist(colorItem);

        // Create variant
        testVariant = PhoneVariant.builder()
                .phone(testPhone)
                .ramItem(ramItem)
                .storageItem(storageItem)
                .colorItem(colorItem)
                .price(new BigDecimal("25000000"))
                .stockQuantity(10)
                .sku("IP15P-256-NT")
                .status("ACTIVE")
                .build();
        em.persist(testVariant);
        testPhone.getVariants().add(testVariant);

        em.flush();
    }

    @Test
    void getPhones_Returns200_NoAuthRequired() throws Exception {
        mvc.perform(get("/api/phones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    void getPhoneDetail_ReturnsPhoneWithVariants() throws Exception {
        // MockMvc uses the test transaction, so fixtures remain visible and roll back.
        mvc.perform(get("/api/phones/" + testPhone.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(testPhone.getId()))
                .andExpect(jsonPath("$.data.variants[0].id").value(testVariant.getId()));
    }

    @Test
    void getPhoneDetail_NotFound() throws Exception {
        mvc.perform(get("/api/phones/99999"))
                .andExpect(status().isNotFound());
    }
}
