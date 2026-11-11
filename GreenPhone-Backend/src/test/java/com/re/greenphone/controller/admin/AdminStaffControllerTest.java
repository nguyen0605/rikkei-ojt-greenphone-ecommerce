package com.re.greenphone.controller.admin;

import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.config.CorsConfig;
import com.re.greenphone.config.SecurityConfig;
import com.re.greenphone.dto.request.CreateStaffRequest;
import com.re.greenphone.dto.response.StaffDTO;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.JwtAuthenticationFilter;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.service.admin.AdminStaffService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringJUnitWebConfig(AdminStaffControllerTest.Config.class)
class AdminStaffControllerTest {

    @Autowired
    WebApplicationContext context;

    @Autowired
    AdminStaffService adminStaffService;

    MockMvc mvc;

    @Configuration
    @EnableWebMvc
    @Import({
            AdminStaffController.class,
            SecurityConfig.class,
            CorsConfig.class,
            GlobalExceptionHandler.class
    })
    static class Config {
        @Bean
        AdminStaffService adminStaffService() {
            return mock(AdminStaffService.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter() {
            return new JwtAuthenticationFilter(mock(JwtTokenProvider.class), mock(UserRepository.class), mock(StringRedisTemplate.class));
        }
    }

    @BeforeEach
    void setup() {
        reset(adminStaffService);
        mvc = webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @DisplayName("Chưa đăng nhập gọi API nhân viên trả về 401 Unauthorized")
    void unauthenticated_Returns401() throws Exception {
        mvc.perform(get("/api/admin/staff"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    @DisplayName("Vai trò CUSTOMER gọi API nhân viên trả về 403 Forbidden")
    void customer_Returns403() throws Exception {
        mvc.perform(get("/api/admin/staff").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("Vai trò SALES gọi API nhân viên trả về 403 Forbidden (chỉ ADMIN tối cao được quản lý nhân sự)")
    void sales_Returns403() throws Exception {
        mvc.perform(get("/api/admin/staff").with(user("sales").roles("SALES")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        mvc.perform(post("/api/admin/staff")
                        .with(user("sales").roles("SALES"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Test\",\"email\":\"test@gp.vn\",\"phone\":\"0900000000\",\"password\":\"123456\",\"role\":\"SALES\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("Vai trò ADMIN lấy danh sách nhân viên thành công 200 OK")
    void admin_GetStaffList_Success() throws Exception {
        StaffDTO staff = StaffDTO.builder()
                .id(1L)
                .fullName("Admin System")
                .email("admin@greenphone.vn")
                .role("ROLE_ADMIN")
                .status("ACTIVE")
                .build();

        PageResponse<StaffDTO> pageResponse = new PageResponse<>(List.of(staff), 0, 10, 1L, 1, true);
        when(adminStaffService.getStaffList(any(), any(), any())).thenReturn(pageResponse);

        mvc.perform(get("/api/admin/staff").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.content[0].email").value("admin@greenphone.vn"));
    }

    @Test
    @DisplayName("Vai trò ADMIN tạo nhân viên mới thành công 201 Created")
    void admin_CreateStaff_Success() throws Exception {
        StaffDTO created = StaffDTO.builder()
                .id(2L)
                .fullName("Nguyen Van Sales")
                .email("sales@greenphone.vn")
                .phone("0912345678")
                .role("ROLE_SALES")
                .status("ACTIVE")
                .build();

        when(adminStaffService.createStaff(any(CreateStaffRequest.class))).thenReturn(created);

        String json = "{\"fullName\":\"Nguyen Van Sales\",\"email\":\"sales@greenphone.vn\",\"phone\":\"0912345678\",\"password\":\"password123\",\"role\":\"ROLE_SALES\"}";

        mvc.perform(post("/api/admin/staff")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.id").value(2L))
                .andExpect(jsonPath("$.data.email").value("sales@greenphone.vn"));
    }

    @Test
    @DisplayName("Vai trò ADMIN cập nhật vai trò nhân viên thành công 200 OK")
    void admin_UpdateStaffRole_Success() throws Exception {
        StaffDTO updated = StaffDTO.builder()
                .id(2L)
                .role("ROLE_WAREHOUSE")
                .build();

        when(adminStaffService.updateStaffRole(eq(2L), any(), any())).thenReturn(updated);

        mvc.perform(put("/api/admin/staff/2/role")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROLE_WAREHOUSE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ROLE_WAREHOUSE"));
    }
}
