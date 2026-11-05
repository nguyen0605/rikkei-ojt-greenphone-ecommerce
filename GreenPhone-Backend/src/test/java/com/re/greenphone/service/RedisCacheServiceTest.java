package com.re.greenphone.service;

import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.entity.Settings;
import com.re.greenphone.mapper.BrandMapper;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.BrandRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.SettingsRepository;
import com.re.greenphone.service.admin.AdminBrandService;
import com.re.greenphone.service.admin.AdminPhoneService;
import com.re.greenphone.service.admin.AdminPromotionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisCacheServiceTest {

    @Mock
    private PhoneRepository phoneRepository;

    @Mock
    private PhoneMapper phoneMapper;

    @Mock
    private PhoneVariantMapper phoneVariantMapper;

    @Mock
    private PhoneImageMapper phoneImageMapper;

    @InjectMocks
    private PhoneService phoneService;

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private BrandMapper brandMapper;

    @InjectMocks
    private BrandService brandService;

    @Mock
    private PromotionRepository promotionRepository;

    @InjectMocks
    private PromotionService promotionService;

    @Mock
    private SettingsRepository settingsRepository;

    @InjectMocks
    private SettingsService settingsService;

    @Test
    @DisplayName("Kiểm tra PhoneService.getPhoneDetail có gán annotation @Cacheable(phones)")
    void testPhoneServiceCacheableAnnotation() throws NoSuchMethodException {
        Method method = PhoneService.class.getMethod("getPhoneDetail", Long.class);
        Cacheable cacheable = method.getAnnotation(Cacheable.class);

        assertNotNull(cacheable, "Phương thức getPhoneDetail phải có annotation @Cacheable");
        assertArrayEquals(new String[]{"phones"}, cacheable.value());
        assertEquals("#id", cacheable.key());
    }

    @Test
    @DisplayName("Kiểm tra BrandService.getAllBrands có gán annotation @Cacheable(brands)")
    void testBrandServiceCacheableAnnotation() throws NoSuchMethodException {
        Method method = BrandService.class.getMethod("getAllBrands");
        Cacheable cacheable = method.getAnnotation(Cacheable.class);

        assertNotNull(cacheable, "Phương thức getAllBrands phải có annotation @Cacheable");
        assertArrayEquals(new String[]{"brands"}, cacheable.value());
        assertEquals("'all'", cacheable.key());
    }

    @Test
    @DisplayName("Kiểm tra PromotionService.getPublicPromotions có gán annotation @Cacheable(promotions)")
    void testPromotionServiceCacheableAnnotation() throws NoSuchMethodException {
        Method method = PromotionService.class.getMethod("getPublicPromotions");
        Cacheable cacheable = method.getAnnotation(Cacheable.class);

        assertNotNull(cacheable, "Phương thức getPublicPromotions phải có annotation @Cacheable");
        assertArrayEquals(new String[]{"promotions"}, cacheable.value());
        assertEquals("'public'", cacheable.key());
    }

    @Test
    @DisplayName("Kiểm tra SettingsService.getPublicSettings có gán annotation @Cacheable(settings)")
    void testSettingsServiceCacheableAnnotation() throws NoSuchMethodException {
        Method method = SettingsService.class.getMethod("getPublicSettings");
        Cacheable cacheable = method.getAnnotation(Cacheable.class);

        assertNotNull(cacheable, "Phương thức getPublicSettings phải có annotation @Cacheable");
        assertArrayEquals(new String[]{"settings"}, cacheable.value());
        assertEquals("'public'", cacheable.key());
    }

    @Test
    @DisplayName("Kiểm tra các phương thức AdminPhoneService có gán @CacheEvict(phones)")
    void testAdminPhoneServiceCacheEvictAnnotation() throws NoSuchMethodException {
        Method updatePhone = AdminPhoneService.class.getMethod("updatePhone", Long.class, com.re.greenphone.dto.request.PhoneRequest.class);
        CacheEvict evictUpdate = updatePhone.getAnnotation(CacheEvict.class);
        assertNotNull(evictUpdate);
        assertArrayEquals(new String[]{"phones"}, evictUpdate.value());
        assertEquals("#id", evictUpdate.key());

        Method deletePhone = AdminPhoneService.class.getMethod("deletePhone", Long.class);
        CacheEvict evictDelete = deletePhone.getAnnotation(CacheEvict.class);
        assertNotNull(evictDelete);
        assertArrayEquals(new String[]{"phones"}, evictDelete.value());
        assertEquals("#id", evictDelete.key());
    }

    @Test
    @DisplayName("Kiểm tra các phương thức AdminBrandService có gán @CacheEvict(brands)")
    void testAdminBrandServiceCacheEvictAnnotation() throws NoSuchMethodException {
        Method createBrand = AdminBrandService.class.getMethod("createBrand", com.re.greenphone.dto.request.BrandRequest.class);
        CacheEvict evictCreate = createBrand.getAnnotation(CacheEvict.class);
        assertNotNull(evictCreate);
        assertArrayEquals(new String[]{"brands"}, evictCreate.value());
        assertTrue(evictCreate.allEntries());
    }

    @Test
    @DisplayName("Kiểm tra PromotionService.getPublicPromotions lọc đúng các voucher active")
    void testGetPublicPromotionsLogic() {
        LocalDateTime now = LocalDateTime.now();
        Promotion activePromo = Promotion.builder()
                .code("ACTIVE10")
                .name("Giảm 10%")
                .status("ACTIVE")
                .discountType("PERCENT")
                .discountValue(BigDecimal.valueOf(10))
                .startDate(now.minusDays(1))
                .endDate(now.plusDays(5))
                .build();
        activePromo.setId(1L);

        Promotion expiredPromo = Promotion.builder()
                .code("EXPIRED")
                .status("ACTIVE")
                .startDate(now.minusDays(5))
                .endDate(now.minusDays(1))
                .build();
        expiredPromo.setId(2L);

        when(promotionRepository.findAll()).thenReturn(List.of(activePromo, expiredPromo));

        List<Map<String, Object>> result = promotionService.getPublicPromotions();
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("ACTIVE10", result.get(0).get("code"));
    }

    @Test
    @DisplayName("Kiểm tra SettingsService.updateSettings kích hoạt lưu và trả về Map cài đặt")
    void testSettingsServiceUpdateSettings() {
        Settings setting = Settings.builder().settingKey("SHIPPING_FEE").settingValue("30000").build();
        when(settingsRepository.findBySettingKey("SHIPPING_FEE")).thenReturn(Optional.of(setting));
        when(settingsRepository.findAll()).thenReturn(List.of(setting));

        Map<String, String> updated = settingsService.updateSettings(Map.of("SHIPPING_FEE", "30000"));
        assertNotNull(updated);
        assertEquals("30000", updated.get("SHIPPING_FEE"));
        verify(settingsRepository).save(any(Settings.class));
    }
}

