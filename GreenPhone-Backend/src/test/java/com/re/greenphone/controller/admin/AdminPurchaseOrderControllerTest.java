package com.re.greenphone.controller.admin;
import com.re.greenphone.config.*;
import com.re.greenphone.common.exception.GlobalExceptionHandler;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.*;
import com.re.greenphone.service.admin.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
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
@SpringJUnitWebConfig(AdminPurchaseOrderControllerTest.Config.class)
class AdminPurchaseOrderControllerTest {
    static final String URL="/api/v1/admin/purchase-orders";
    static final String VALID="{\"supplierId\":3,\"warehouseId\":2,\"items\":[{\"variantId\":7,\"quantity\":50,\"unitCost\":25000000}]}";
    @Autowired WebApplicationContext context;
    @Autowired AdminPurchaseOrderService service;
    MockMvc mvc;
    @Configuration @EnableWebMvc
    @Import({AdminPurchaseOrderController.class,AdminSupplierController.class,ProcurementExceptionHandler.class,SecurityConfig.class,CorsConfig.class,GlobalExceptionHandler.class})
    static class Config {
        @Bean AdminPurchaseOrderService service() { return mock(AdminPurchaseOrderService.class); }
        @Bean AdminSupplierService suppliers() { return mock(AdminSupplierService.class); }
        @Bean JwtAuthenticationFilter jwtAuthenticationFilter() { return new JwtAuthenticationFilter(mock(JwtTokenProvider.class),mock(UserRepository.class),mock(StringRedisTemplate.class)); }
    }
    @BeforeEach void setup() { reset(service); mvc=webAppContextSetup(context).apply(springSecurity()).build(); }
    @Test void anonymousIsUnauthorized() throws Exception { mvc.perform(get(URL)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401)); }
    @Test void customerCannotReceive() throws Exception { mvc.perform(post(URL+"/1/receive").with(user("customer").roles("CUSTOMER"))).andExpect(status().isForbidden()); verifyNoInteractions(service); }
    @Test void adminCreatesWrapped201() throws Exception { mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(VALID)).andExpect(status().isCreated()).andExpect(jsonPath("$.code").value(201)); verify(service).create(any()); }
    @Test void emptyLinesRejected() throws Exception { mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content("{\"supplierId\":3,\"warehouseId\":2,\"items\":[]}")).andExpect(status().isBadRequest()); verifyNoInteractions(service); }
    @Test void invalidQuantityRejected() throws Exception { mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(VALID.replace("50","0"))).andExpect(status().isBadRequest()); verifyNoInteractions(service); }
    @Test void malformedJsonRejected() throws Exception { mvc.perform(post(URL).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content("{")).andExpect(status().isBadRequest()); }
    @Test void adminReceivesWrappedResponse() throws Exception { mvc.perform(post(URL+"/1/receive").with(user("admin").roles("ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200)); verify(service).receive(1L); }
}
