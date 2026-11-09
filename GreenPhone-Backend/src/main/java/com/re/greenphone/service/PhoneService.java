package com.re.greenphone.service;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.BrandFilterDTO;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.specification.PhoneSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PhoneService {

    private final PhoneRepository phoneRepository;
    private final PhoneMapper phoneMapper;
    private final PhoneVariantMapper phoneVariantMapper;
    private final PhoneImageMapper phoneImageMapper;

    /** Width for Pexels image resizing on listing cards (square aspect). */
    private static final int LISTING_IMAGE_WIDTH = 400;

    public PageResponse<PhoneDTO> getPhones(List<Long> brandIds, List<String> rams, List<String> storages,
                                            List<String> colors, List<String> features,
                                            BigDecimal minPrice, BigDecimal maxPrice,
                                            String sort, PageRequest pageRequest) {
        Specification<Phone> spec = PhoneSpecification.filterPhones(
                null, brandIds, rams, storages, colors, features, minPrice, maxPrice, sort);

        int page = Math.max(0, pageRequest.getPage());
        int size = pageRequest.getSize() <= 0 ? 10 : Math.min(pageRequest.getSize(), 100);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);

        // N+1 eliminated: Brand fetched via EntityGraph, variants/images batch-loaded via BatchSize
        Page<Phone> phonePage = phoneRepository.findAll(spec, pageable);
        List<PhoneDTO> dtos = phonePage.getContent().stream()
                .map(this::toListingDto)
                .toList();

        return new PageResponse<>(dtos, phonePage.getNumber(), phonePage.getSize(),
                phonePage.getTotalElements(), phonePage.getTotalPages(), phonePage.isLast());
    }

    @Cacheable(value = "phones", key = "#id")
    public PhoneDetailDTO getPhoneDetail(Long id) {
        // Chỉ hiển thị sản phẩm ACTIVE trong store; INACTIVE (admin tắt) → 404
        Phone phone = phoneRepository.findByIdAndStatus(id, "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));

        PhoneDetailDTO dto = new PhoneDetailDTO();
        dto.setId(phone.getId());
        dto.setBrandId(phone.getBrand().getId());
        dto.setBrandName(phone.getBrand().getName());
        dto.setName(phone.getName());
        dto.setDescription(phone.getDescription());
        dto.setScreen(phone.getScreen());
        dto.setOs(phone.getOs());
        dto.setChip(phone.getChip());
        dto.setRearCamera(phone.getRearCamera());
        dto.setFrontCamera(phone.getFrontCamera());
        dto.setBattery(phone.getBattery());
        dto.setWarranty(phone.getWarranty());
        dto.setStatus(phone.getStatus());
        dto.setImages(phoneImageMapper.toDtoList(phone.getImages()));
        dto.setVariants(phoneVariantMapper.toDtoList(phone.getVariants()));
        dto.setAvgRating(calculateAvgRating(phone));
        dto.setReviewCount((long) phone.getReviews().size());
        return dto;
    }

    public PageResponse<PhoneDTO> search(String query, List<Long> brandIds, List<String> rams,
                                         List<String> storages, List<String> colors, List<String> features,
                                         BigDecimal minPrice, BigDecimal maxPrice,
                                         String sort, PageRequest pageRequest) {
        int page = Math.max(0, pageRequest.getPage());
        int size = pageRequest.getSize() <= 0 ? 10 : Math.min(pageRequest.getSize(), 100);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);

        Specification<Phone> spec = PhoneSpecification.filterPhones(
                query, brandIds, rams, storages, colors, features, minPrice, maxPrice, sort);

        Page<Phone> phonePage = phoneRepository.findAll(spec, pageable);
        List<PhoneDTO> dtos = phonePage.getContent().stream()
                .map(this::toListingDto)
                .toList();

        return new PageResponse<>(dtos, phonePage.getNumber(), phonePage.getSize(),
                phonePage.getTotalElements(), phonePage.getTotalPages(), phonePage.isLast());
    }

    public Map<String, Object> getFilters() {
        List<BrandFilterDTO> brands = phoneRepository.findDistinctBrands();
        return Map.of(
                "brands", brands.stream()
                        .map(b -> Map.of("id", b.getId(), "name", b.getName()))
                        .toList()
        );
    }

    // ---- helpers ----

    /**
     * Maps a Phone entity to a PhoneDTO for listing pages.
     * Resizes the main image URL via Pexels query params (or passes through for other CDNs).
     */
    private PhoneDTO toListingDto(Phone phone) {
        PhoneDTO dto = phoneMapper.toDto(phone);
        dto.setMainImageUrl(getMainImageUrl(phone));
        dto.setVariantCount((long) phone.getVariants().size());
        dto.setAvgRating(calculateAvgRating(phone));
        dto.setLowestPrice(getLowestPrice(phone));
        return dto;
    }

    private Long getLowestPrice(Phone phone) {
        return phone.getVariants().stream()
                .map(v -> v.getDiscountPrice() != null ? v.getDiscountPrice() : v.getPrice())
                .map(java.math.BigDecimal::longValue)
                .min(Long::compareTo)
                .orElse(null);
    }

    private String getMainImageUrl(Phone phone) {
        List<PhoneImage> images = phone.getImages();
        if (images.isEmpty()) return null;

        PhoneImage main = images.stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                .findFirst()
                .orElse(images.get(0));
        String url = main.getImageUrl();
        if (url == null || url.isBlank()) return null;

        if (url.contains("pexels.com")) {
            String sep = url.contains("?") ? "&" : "?";
            return url + sep + "auto=compress&w=" + LISTING_IMAGE_WIDTH + "&h=" + LISTING_IMAGE_WIDTH + "&fit=crop";
        }

        return url;
    }

    private Double calculateAvgRating(Phone phone) {
        if (phone.getReviews().isEmpty()) return 0.0;
        return phone.getReviews().stream()
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average()
                .orElse(0.0);
    }
}
