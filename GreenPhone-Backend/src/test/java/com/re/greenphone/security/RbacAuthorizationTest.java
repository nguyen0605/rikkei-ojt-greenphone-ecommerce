package com.re.greenphone.security;

import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.config.CorsConfig;
import com.re.greenphone.config.SecurityConfig;
import com.re.greenphone.controller.admin.*;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.dto.response.WarehouseResponse;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.service.RefundService;
import com.re.greenphone.service.SettingsService;
import com.re.greenphone.service.admin.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringJUnitWebConfig(RbacAuthorizationTest.Config.class)
class RbacAuthorizationTest {

    @Autowired
    WebApplicationContext context;

    @Autowired
    AdminOrderService adminOrderService;

    @Autowired
    AdminWarehouseService adminWarehouseService;

    @Autowired
    AdminPhoneService adminPhoneService;

    @Autowired
    AdminPromotionService adminPromotionService;

    @Autowired
    SettingsService settingsService;

    @Autowired
    AdminUserService adminUserService;

    MockMvc mvc;

    @Configuration
    @EnableWebMvc
    @Import({
            AdminOrderController.class,
            AdminWarehouseController.class,
            AdminPhoneController.class,
            AdminPromotionController.class,
            AdminSettingsController.class,
            AdminUserController.class,
            SecurityConfig.class,
            CorsConfig.class,
            GlobalExceptionHandler.class
    })
    static class Config {
        @Bean
        AdminOrderService adminOrderService() {
            return mock(AdminOrderService.class);
        }

        @Bean
        RefundService refundService() {
            return mock(RefundService.class);
        }

        @Bean
        AdminWarehouseService adminWarehouseService() {
            return mock(AdminWarehouseService.class);
        }

        @Bean
        AdminPhoneService adminPhoneService() {
            return mock(AdminPhoneService.class);
        }

        @Bean
        AdminPromotionService adminPromotionService() {
            return mock(AdminPromotionService.class);
        }

        @Bean
        SettingsService settingsService() {
            return mock(SettingsService.class);
        }

        @Bean
        AdminUserService adminUserService() {
            return mock(AdminUserService.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter() {
            return new JwtAuthenticationFilter(mock(JwtTokenProvider.class), mock(UserRepository.class), mock(StringRedisTemplate.class));
        }
    }

    @BeforeEach
    void setup() {
        reset(adminOrderService, adminWarehouseService, adminPhoneService, adminPromotionService, adminUserService);
        mvc = webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("Anonymous user receives 401 when accessing admin endpoints")
    void anonymousUserReceives401() throws Exception {
        mvc.perform(get("/api/admin/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    @DisplayName("CUSTOMER role receives 403 Forbidden on all admin endpoints")
    void customerRoleReceives403OnAdminEndpoints() throws Exception {
        mvc.perform(get("/api/admin/orders").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        mvc.perform(get("/api/v1/admin/warehouses").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        mvc.perform(get("/api/admin/phones").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("SALES role can access orders, but is denied on phones and warehouses")
    void salesRolePermissions() throws Exception {
        // Allowed: orders
        mvc.perform(get("/api/admin/orders").with(user("sales").roles("SALES")))
                .andExpect(status().isOk());

        // Denied: warehouse (403)
        mvc.perform(get("/api/v1/admin/warehouses").with(user("sales").roles("SALES")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        // Denied: phones (403)
        mvc.perform(get("/api/admin/phones").with(user("sales").roles("SALES")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        // Denied: settings (403)
        mvc.perform(get("/api/admin/settings").with(user("sales").roles("SALES")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("WAREHOUSE role can access warehouses, but is denied on phones and promotions")
    void warehouseRolePermissions() throws Exception {
        WarehouseResponse wh = new WarehouseResponse(1L, "WH-HN-01", "Kho Ha Noi", "Ha Noi", "ACTIVE", null, null);
        when(adminWarehouseService.getAll()).thenReturn(List.of(wh));

        // Allowed: warehouses
        mvc.perform(get("/api/v1/admin/warehouses").with(user("warehouse").roles("WAREHOUSE")))
                .andExpect(status().isOk());

        // Denied: phones (403)
        mvc.perform(get("/api/admin/phones").with(user("warehouse").roles("WAREHOUSE")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        // Denied: promotions (403)
        mvc.perform(get("/api/admin/promotions").with(user("warehouse").roles("WAREHOUSE")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("MARKETING role can access phones and promotions, but is denied on warehouses and settings")
    void marketingRolePermissions() throws Exception {
        // Allowed: phones
        mvc.perform(get("/api/admin/phones").with(user("marketing").roles("MARKETING")))
                .andExpect(status().isOk());

        // Allowed: promotions
        mvc.perform(get("/api/admin/promotions").with(user("marketing").roles("MARKETING")))
                .andExpect(status().isOk());

        // Denied: warehouses (403)
        mvc.perform(get("/api/v1/admin/warehouses").with(user("marketing").roles("MARKETING")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        // Denied: settings (403)
        mvc.perform(get("/api/admin/settings").with(user("marketing").roles("MARKETING")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("ADMIN role has full access to all endpoints")
    void adminRoleHasFullAccess() throws Exception {
        when(adminWarehouseService.getAll()).thenReturn(Collections.emptyList());

        mvc.perform(get("/api/admin/orders").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/admin/warehouses").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/admin/phones").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/admin/promotions").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/admin/settings").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SALES can view users but cannot update user status (ADMIN only)")
    void userStatusUpdateIsAdminOnly() throws Exception {
        // SALES can view users
        mvc.perform(get("/api/admin/users").with(user("sales").roles("SALES")))
                .andExpect(status().isOk());

        // SALES cannot update status -> 403
        mvc.perform(put("/api/admin/users/1/status")
                        .with(user("sales").roles("SALES"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"BLOCKED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        // ADMIN can update status
        mvc.perform(put("/api/admin/users/1/status")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"BLOCKED\"}"))
                .andExpect(status().isOk());
    }
}
