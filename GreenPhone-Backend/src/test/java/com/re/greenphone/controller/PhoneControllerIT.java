package com.re.greenphone.controller;

import com.re.greenphone.config.BaseIntegrationTest;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.PhoneVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for the /api/phones endpoints.
 * Requires Docker for Testcontainers MySQL.
 */
class PhoneControllerIT extends BaseIntegrationTest {

    @Autowired
    private PhoneVariantRepository phoneVariantRepository;

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

        em.flush();
    }

    @Test
    void getPhones_Returns200_NoAuthRequired() {
        ResponseEntity<Map> response = doGet("/phones", null, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void getPhoneDetail_ReturnsPhoneWithVariants() {
        ResponseEntity<Map> response = doGet("/phones/" + testPhone.getId(), null, Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("data")).isNotNull();
    }

    @Test
    void getPhoneDetail_NotFound() {
        ResponseEntity<Map> response = doGet("/phones/99999", null, Map.class);

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
    }
}
