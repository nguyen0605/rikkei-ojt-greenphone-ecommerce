package com.re.greenphone.controller.admin;
import com.re.greenphone.config.*;
import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.*;
import com.re.greenphone.service.admin.AdminStatisticsService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;
@SpringJUnitWebConfig(AdminStatisticsControllerTest.Config.class)
class AdminStatisticsControllerTest {
    @Autowired WebApplicationContext context;
    @Autowired AdminStatisticsService service;
    MockMvc mvc;
    @Configuration @EnableWebMvc
    @Import({AdminStatisticsController.class,SecurityConfig.class,CorsConfig.class,GlobalExceptionHandler.class})
    static class Config {
        @Bean AdminStatisticsService statistics() { return mock(AdminStatisticsService.class); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() { return new JwtAuthenticationFilter(mock(JwtTokenProvider.class),mock(UserRepository.class),mock(StringRedisTemplate.class)); }
    }
    @BeforeEach void setup() { reset(service); mvc=webAppContextSetup(context).apply(springSecurity()).build(); }
    @ParameterizedTest @CsvSource({"ADMIN,orders,200","SALES,orders,200","WAREHOUSE,orders,200","MARKETING,orders,200","ADMIN,top-selling,200","SALES,top-selling,200","WAREHOUSE,top-selling,200","MARKETING,top-selling,200","ADMIN,revenue,200","SALES,revenue,200","MARKETING,revenue,200","WAREHOUSE,revenue,403","ADMIN,financial-report,200","SALES,financial-report,403","WAREHOUSE,financial-report,403","MARKETING,financial-report,403","CUSTOMER,orders,403"})
    void enforcesRoleMatrix(String role,String endpoint,int status) throws Exception {
        mvc.perform(get("/api/admin/statistics/"+endpoint).with(user("test").roles(role))).andExpect(status().is(status));
        if(status==403) verifyNoInteractions(service);
    }
    @Test void anonymousRejected() throws Exception { mvc.perform(get("/api/admin/statistics/orders")).andExpect(status().isUnauthorized()); }
    @Test void malformedTimestampReturnsWrapped400() throws Exception {
        mvc.perform(get("/api/admin/statistics/financial-report").param("from","invalid").with(user("admin").roles("ADMIN")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        verifyNoInteractions(service);
    }
}
