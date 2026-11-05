package com.re.greenphone.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.dto.response.PromotionDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class RedisConfigTest {

    private RedisConfig redisConfig;

    @Mock
    private RedisConnectionFactory connectionFactory;

    @Mock
    private Cache mockCache;

    @BeforeEach
    void setUp() throws Exception {
        redisConfig = new RedisConfig();
        Field field = RedisConfig.class.getDeclaredField("defaultTtlMillis");
        field.setAccessible(true);
        field.set(redisConfig, 1800000L);
    }

    @Test
    @DisplayName("Kiểm tra ObjectMapper đăng ký module thời gian và serialize thành công")
    void testRedisObjectMapper() throws Exception {
        ObjectMapper mapper = redisConfig.redisObjectMapper();
        assertNotNull(mapper);

        // Kiểm tra serialize LocalDateTime
        PromotionDTO promo = PromotionDTO.builder()
                .id(1L)
                .code("SALE10")
                .discountValue(BigDecimal.valueOf(10))
                .startDate(LocalDateTime.of(2026, 1, 1, 10, 0))
                .endDate(LocalDateTime.of(2026, 1, 2, 10, 0))
                .build();

        String json = mapper.writeValueAsString(promo);
        assertNotNull(json);
        assertTrue(json.contains("SALE10"));
        assertTrue(json.contains("@class"));

        // Kiểm tra deserialize
        PromotionDTO deserialized = mapper.readValue(json, PromotionDTO.class);
        assertEquals("SALE10", deserialized.getCode());
        assertEquals(LocalDateTime.of(2026, 1, 1, 10, 0), deserialized.getStartDate());
    }

    @Test
    @DisplayName("Kiểm tra RedisTemplate được cấu hình đúng ConnectionFactory và Serializer")
    void testRedisTemplateConfiguration() {
        ObjectMapper mapper = redisConfig.redisObjectMapper();
        GenericJackson2JsonRedisSerializer jsonSerializer = redisConfig.redisJsonSerializer(mapper);

        RedisTemplate<String, Object> template = redisConfig.redisTemplate(connectionFactory, jsonSerializer);
        assertNotNull(template);
        assertEquals(connectionFactory, template.getConnectionFactory());
        assertNotNull(template.getKeySerializer());
        assertNotNull(template.getValueSerializer());
    }

    @Test
    @DisplayName("Kiểm tra CacheManager cấu hình TTL riêng biệt cho Catalog, Promotion và Settings")
    void testCacheManagerTtlConfigurations() {
        ObjectMapper mapper = redisConfig.redisObjectMapper();
        GenericJackson2JsonRedisSerializer jsonSerializer = redisConfig.redisJsonSerializer(mapper);

        RedisCacheManager manager = redisConfig.cacheManager(connectionFactory, jsonSerializer);
        assertNotNull(manager);

        Map<String, RedisCacheConfiguration> cacheConfigs = manager.getCacheConfigurations();
        assertNotNull(cacheConfigs);

        // Kiểm tra danh mục phones có TTL 30 phút
        RedisCacheConfiguration phonesConfig = cacheConfigs.get("phones");
        assertNotNull(phonesConfig);
        assertEquals(Duration.ofMinutes(30), phonesConfig.getTtlFunction().getTimeToLive("dummy", "dummy"));

        // Kiểm tra danh mục brands có TTL 60 phút
        RedisCacheConfiguration brandsConfig = cacheConfigs.get("brands");
        assertNotNull(brandsConfig);
        assertEquals(Duration.ofMinutes(60), brandsConfig.getTtlFunction().getTimeToLive("dummy", "dummy"));

        // Kiểm tra danh mục promotions có TTL 15 phút
        RedisCacheConfiguration promotionsConfig = cacheConfigs.get("promotions");
        assertNotNull(promotionsConfig);
        assertEquals(Duration.ofMinutes(15), promotionsConfig.getTtlFunction().getTimeToLive("dummy", "dummy"));

        // Kiểm tra cài đặt settings có TTL 120 phút
        RedisCacheConfiguration settingsConfig = cacheConfigs.get("settings");
        assertNotNull(settingsConfig);
        assertEquals(Duration.ofMinutes(120), settingsConfig.getTtlFunction().getTimeToLive("dummy", "dummy"));

        // Kiểm tra banner có TTL 60 phút
        RedisCacheConfiguration bannersConfig = cacheConfigs.get("banners");
        assertNotNull(bannersConfig);
        assertEquals(Duration.ofMinutes(60), bannersConfig.getTtlFunction().getTimeToLive("dummy", "dummy"));
    }

    @Test
    @DisplayName("Kiểm tra CacheErrorHandler nuốt lỗi an toàn khi Redis gặp sự cố")
    void testCacheErrorHandlerResilience() {
        CacheErrorHandler handler = redisConfig.errorHandler();
        assertNotNull(handler);

        // Đảm bảo không phương thức nào ném RuntimeException khi Redis ngắt kết nối
        assertDoesNotThrow(() -> handler.handleCacheGetError(new RuntimeException("Redis connection refused"), mockCache, "key1"));
        assertDoesNotThrow(() -> handler.handleCachePutError(new RuntimeException("Redis connection timeout"), mockCache, "key1", "val1"));
        assertDoesNotThrow(() -> handler.handleCacheEvictError(new RuntimeException("Redis error"), mockCache, "key1"));
        assertDoesNotThrow(() -> handler.handleCacheClearError(new RuntimeException("Redis error"), mockCache));
    }
}

