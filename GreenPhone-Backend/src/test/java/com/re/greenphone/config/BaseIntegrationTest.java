package com.re.greenphone.config;

import com.re.greenphone.entity.Role;
import com.re.greenphone.entity.User;
import com.re.greenphone.enums.RoleName;
import com.re.greenphone.security.JwtTokenProvider;
import com.re.greenphone.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Transactional
public abstract class BaseIntegrationTest extends MySQLTestContainer {

    @LocalServerPort
    protected int port;

    @Autowired
    protected EntityManager em;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    protected final RestTemplate restTemplate = new RestTemplate();

    protected Role customerRole;
    protected Role adminRole;

    protected User customerA;
    protected User customerB;
    protected User adminUser;

    protected String customerAToken;
    protected String customerBToken;
    protected String adminToken;

    protected String baseUrl() {
        return "http://localhost:" + port + "/api";
    }

    protected void setupBaseData() {
        customerRole = new Role();
        customerRole.setName(RoleName.CUSTOMER.name());
        customerRole.setDescription("Customer");
        em.persist(customerRole);
        adminRole = new Role();
        adminRole.setName(RoleName.ADMIN.name());
        adminRole.setDescription("Admin");
        em.persist(adminRole);

        customerA = new User();
        customerA.setFullName("Customer A");
        customerA.setEmail("customerA@example.com");
        customerA.setPassword(passwordEncoder.encode("password123"));
        customerA.setPhone("0900000001");
        customerA.setStatus("ACTIVE");
        customerA.setRole(customerRole);
        em.persist(customerA);

        customerB = new User();
        customerB.setFullName("Customer B");
        customerB.setEmail("customerB@example.com");
        customerB.setPassword(passwordEncoder.encode("password123"));
        customerB.setPhone("0900000002");
        customerB.setStatus("ACTIVE");
        customerB.setRole(customerRole);
        em.persist(customerB);

        adminUser = new User();
        adminUser.setFullName("Admin User");
        adminUser.setEmail("admin@example.com");
        adminUser.setPassword(passwordEncoder.encode("admin123"));
        adminUser.setPhone("0900000000");
        adminUser.setStatus("ACTIVE");
        adminUser.setRole(adminRole);
        em.persist(adminUser);

        em.flush();

        customerAToken = jwtTokenProvider.generateToken(UserPrincipal.create(customerA));
        customerBToken = jwtTokenProvider.generateToken(UserPrincipal.create(customerB));
        adminToken = jwtTokenProvider.generateToken(UserPrincipal.create(adminUser));
    }

    protected HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null && !token.isEmpty()) {
            headers.setBearerAuth(token);
        }
        return headers;
    }

    protected <T> ResponseEntity<T> doGet(String path, String token, Class<T> responseType) {
        return restTemplate.exchange(
                baseUrl() + path, HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), responseType);
    }

    protected <T> ResponseEntity<T> doPost(String path, Object body, String token, Class<T> responseType) {
        return restTemplate.exchange(
                baseUrl() + path, HttpMethod.POST,
                new HttpEntity<>(body, authHeaders(token)), responseType);
    }

    protected <T> ResponseEntity<T> doPut(String path, Object body, String token, Class<T> responseType) {
        return restTemplate.exchange(
                baseUrl() + path, HttpMethod.PUT,
                new HttpEntity<>(body, authHeaders(token)), responseType);
    }

    protected <T> ResponseEntity<T> doDelete(String path, String token, Class<T> responseType) {
        return restTemplate.exchange(
                baseUrl() + path, HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token)), responseType);
    }
}
