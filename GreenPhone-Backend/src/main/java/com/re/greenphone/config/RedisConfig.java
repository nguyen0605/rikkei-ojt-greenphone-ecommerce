package com.re.greenphone.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
@EnableCaching
public class RedisConfig implements CachingConfigurer {

    @Value("${spring.cache.redis.time-to-live:1800000}")
    private long defaultTtlMillis;

    @Bean
    public ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );
        return mapper;
    }

    @Bean
    @SuppressWarnings({"deprecation", "removal"})
    public RedisSerializer<Object> redisJsonSerializer(ObjectMapper redisObjectMapper) {
        return new GenericJackson2JsonRedisSerializer(redisObjectMapper);
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory connectionFactory,
            RedisSerializer<Object> redisJsonSerializer) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(redisJsonSerializer);
        template.setHashValueSerializer(redisJsonSerializer);
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisCacheManager cacheManager(
            RedisConnectionFactory connectionFactory,
            RedisSerializer<Object> redisJsonSerializer) {

        RedisCacheConfiguration defaultConfiguration = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMillis(defaultTtlMillis))
                .disableCachingNullValues()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
                )
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(redisJsonSerializer)
                );

        // Cấu hình TTL riêng biệt cho từng loại danh mục (Catalog, Promotion, Settings, Banner)
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // Danh mục sản phẩm (phones): TTL 30 phút
        cacheConfigurations.put("phones", defaultConfiguration.entryTtl(Duration.ofMinutes(30)));

        // Hãng sản xuất (brands): TTL 60 phút
        cacheConfigurations.put("brands", defaultConfiguration.entryTtl(Duration.ofMinutes(60)));

        // Chương trình khuyến mại (promotions): TTL 15 phút
        cacheConfigurations.put("promotions", defaultConfiguration.entryTtl(Duration.ofMinutes(15)));

        // Cài đặt hệ thống (settings): TTL 120 phút (2 giờ)
        cacheConfigurations.put("settings", defaultConfiguration.entryTtl(Duration.ofMinutes(120)));

        // Banner quảng cáo (banners): TTL 60 phút
        cacheConfigurations.put("banners", defaultConfiguration.entryTtl(Duration.ofMinutes(60)));

        RedisCacheManager manager = RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfiguration)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
        manager.afterPropertiesSet();
        return manager;
    }

    @Bean
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Lỗi đọc cache từ Redis (cache: {}, key: {}). Tự động fallback đọc trực tiếp từ DB. Chi tiết: {}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Lỗi ghi cache vào Redis (cache: {}, key: {}). Bỏ qua lưu cache. Chi tiết: {}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Lỗi xóa cache từ Redis (cache: {}, key: {}). Chi tiết: {}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Lỗi dọn sạch cache từ Redis (cache: {}). Chi tiết: {}",
                        cache != null ? cache.getName() : "unknown", exception.getMessage());
            }
        };
    }
}

