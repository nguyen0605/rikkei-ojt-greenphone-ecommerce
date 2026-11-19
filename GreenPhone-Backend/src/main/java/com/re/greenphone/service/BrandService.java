package com.re.greenphone.service;

import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.mapper.BrandMapper;
import com.re.greenphone.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BrandService {

    public static final String R2_BRAND_BASE = "https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/";

    public static final Map<String, String> OFFICIAL_R2_BRAND_LOGOS = Map.of(
            "apple", R2_BRAND_BASE + "Apple.webp",
            "samsung", R2_BRAND_BASE + "samsung.avif",
            "xiaomi", R2_BRAND_BASE + "Xiaomi.webp",
            "oppo", R2_BRAND_BASE + "OPPO.webp",
            "asus", R2_BRAND_BASE + "ASUS_Logo_1.png",
            "oneplus", R2_BRAND_BASE + "oneplus.svg.webp",
            "google pixel", R2_BRAND_BASE + "google-pixel.svg",
            "google", R2_BRAND_BASE + "google-pixel.svg",
            "sony", R2_BRAND_BASE + "sony.svg"
    );

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;

    @Cacheable(value = "brands", key = "'all'")
    public List<BrandDTO> getAllBrands() {
        // Chỉ hiển thị hãng đang hoạt động trong store (admin toggle ACTIVE/INACTIVE)
        List<BrandDTO> dtos = brandMapper.toDtoList(brandRepository.findByStatus("ACTIVE"));
        dtos.forEach(this::resolveBrandLogo);
        return dtos;
    }

    public void resolveBrandLogo(BrandDTO dto) {
        if (dto == null || dto.getName() == null) return;
        String key = dto.getName().trim().toLowerCase();
        if (OFFICIAL_R2_BRAND_LOGOS.containsKey(key)) {
            dto.setLogoUrl(OFFICIAL_R2_BRAND_LOGOS.get(key));
        } else if (key.contains("google")) {
            dto.setLogoUrl(OFFICIAL_R2_BRAND_LOGOS.get("google pixel"));
        }
    }
}
