package com.re.greenphone.controller.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.config.CorsConfig;
import com.re.greenphone.config.SecurityConfig;
import com.re.greenphone.dto.response.WarehouseResponse;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.JwtAuthenticationFilter;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.service.admin.AdminWarehouseService;
import com.re.greenphone.service.admin.WarehouseInventoryService;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.dto.response.WarehouseStockResponse;
import com.re.greenphone.entity.PhoneVariant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringJUnitWebConfig(AdminWarehouseControllerTest.Config.class)
class AdminWarehouseControllerTest {
    static final String URL = "/api/v1/admin/warehouses";
    static final String VALID = "{\"code\":\"WH-DN-HAI-CHAU\",\"name\":\"Kho Da Nang\",\"address\":\"Hai Chau\"}";
    final WarehouseResponse dto = new WarehouseResponse(3L, "WH-DN-HAI-CHAU", "Kho Da Nang", "Hai Chau", "ACTIVE", null, null);
    @Autowired WebApplicationContext context;
    @Autowired AdminWarehouseService service;
    @Autowired WarehouseInventoryService inventory;
    @Autowired PhoneVariantMapper variantMapper;
    MockMvc mvc;

    @Configuration
    @EnableWebMvc
    @Import({AdminWarehouseController.class, WarehouseInventoryController.class, WarehouseExceptionHandler.class, SecurityConfig.class, CorsConfig.class, GlobalExceptionHandler.class})
    static class Config {
        @Bean AdminWarehouseService service() { return mock(AdminWarehouseService.class); }
        @Bean WarehouseInventoryService inventory() { return mock(WarehouseInventoryService.class); }
        @Bean PhoneVariantMapper variantMapper() { return mock(PhoneVariantMapper.class); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() {
            return new JwtAuthenticationFilter(mock(JwtTokenProvider.class), mock(UserRepository.class), mock(StringRedisTemplate.class));
        }
    }

    @BeforeEach
    void setup() {
        reset(service, inventory, variantMapper);
        mvc = webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousGetsWrapped401() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        verifyNoInteractions(service);
    }

    @Test
    void customerCannotReadOrWrite() throws Exception {
        mvc.perform(get(URL).with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403));
        mvc.perform(post(URL).with(user("customer").roles("CUSTOMER")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403));
        verifyNoInteractions(service);
    }

    @Test
    void adminListsAndReadsDto() throws Exception {
        when(service.getAll()).thenReturn(List.of(dto));
        when(service.getById(3L)).thenReturn(dto);
        mvc.perform(get(URL).with(user("admin").roles("ADMIN"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value(dto.code()));
        mvc.perform(get(URL + "/3").with(user("admin").roles("ADMIN"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(3));
    }

    @Test
    void adminCreatesUpdatesAndDeactivates() throws Exception {
        when(service.create(any())).thenReturn(dto);
        when(service.update(eq(3L), any())).thenReturn(dto);
        when(service.updateStatus(3L, "INACTIVE")).thenReturn(
                new WarehouseResponse(3L, dto.code(), dto.name(), dto.address(), "INACTIVE", null, null));
        mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.code").value(201)).andExpect(jsonPath("$.data.id").value(3));
        mvc.perform(put(URL + "/3").with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.code").value(dto.code()));
        mvc.perform(patch(URL + "/3/status").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"wh-hn", "WH HN", "WH-ĐN", "-WH", "WH--HN", ""})
    void rejectsInvalidCode(String code) throws Exception {
        mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON)
                .content(VALID.replace("WH-DN-HAI-CHAU", code))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.code").exists());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsBlankAndOversizedFieldsAndInvalidStatus() throws Exception {
        for (String body : List.of("{}", VALID.replace("Kho Da Nang", " "), VALID.replace("Kho Da Nang", "AB"),
                VALID.replace("Kho Da Nang", " a "), VALID.replace("Hai Chau", " "),
                VALID.replace("WH-DN-HAI-CHAU", "A".repeat(51)), VALID.replace("Kho Da Nang", "A".repeat(151)),
                VALID.replace("Hai Chau", "A".repeat(256)))) {
            mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        }
        mvc.perform(patch(URL + "/3/status").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DELETED\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void duplicateAndMissingWarehouseUseWrappedErrors() throws Exception {
        when(service.create(any())).thenThrow(new BadRequestException("Warehouse code already exists"));
        when(service.getById(99L)).thenThrow(new ResourceNotFoundException("Warehouse", "id", 99L));
        mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        mvc.perform(get(URL + "/99").with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void rejectsMalformedJsonAndNonNumericId() throws Exception {
        mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        mvc.perform(get(URL + "/invalid").with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void allocationAndMovementEndpointsEnforceRolesAndPositiveQuantities() throws Exception {
        mvc.perform(get("/api/v1/admin/inventory/variants/7/warehouses"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        String body = "{\"variantId\":7,\"quantity\":0,\"changeType\":\"EXPORT\",\"reason\":\"Test\"}";
        mvc.perform(post(URL + "/1/stock/movements").with(user("customer").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post(URL + "/1/stock/movements").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.quantity").exists());
        verifyNoInteractions(inventory);
    }

    @Test
    void allocationAndTransferReturnWrappedDtos() throws Exception {
        var row = new WarehouseStockResponse(1L, "WH-HN-MAIN", "Ha Noi", "ACTIVE", 7L, 11L, "Phone", "SKU", "8GB", "128GB", "Black", 60, 60);
        when(inventory.distribution(7L)).thenReturn(List.of(row));
        mvc.perform(get("/api/v1/admin/inventory/variants/7/warehouses").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].quantity").value(60));
        PhoneVariant variant = new PhoneVariant();
        when(inventory.transfer(eq(1L), any())).thenReturn(variant);
        when(variantMapper.toDto(variant)).thenReturn(PhoneVariantDTO.builder().id(7L).stockQuantity(60).build());
        mvc.perform(post(URL + "/1/stock/transfers").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"variantId\":7,\"targetWarehouseId\":3,\"quantity\":1,\"reason\":\"Test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.stockQuantity").value(60));
    }
}
