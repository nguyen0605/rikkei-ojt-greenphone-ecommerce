package com.re.greenphone.service;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.BrandFilterDTO;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Review;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PhoneService {

    private final PhoneRepository phoneRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PhoneMapper phoneMapper;
    private final PhoneVariantMapper phoneVariantMapper;
    private final PhoneImageMapper phoneImageMapper;

    /** Width for Pexels image resizing on listing cards (square aspect). */
    private static final int LISTING_IMAGE_WIDTH = 400;

    public PageResponse<PhoneDTO> getPhones(List<Long> brandIds, List<String> rams, List<String> storages,
                                            List<String> colors, List<String> features,
                                            BigDecimal minPrice, BigDecimal maxPrice,
                                            String sort, PageRequest pageRequest) {
        Specification<Phone> spec = buildSpec(null, brandIds, rams, storages, colors, features, minPrice, maxPrice, sort);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize());

        // Images/variants/reviews batch-loaded via hibernate.default_batch_fetch_size.
        Page<Phone> page = phoneRepository.findAll(spec, pageable);
        List<PhoneDTO> dtos = page.getContent().stream()
                .map(this::toListingDto)
                .toList();

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    /**
     * Get phone detail by ID. Only ACTIVE phones are accessible.
     */
    public PhoneDetailDTO getPhoneDetail(Long id) {
        Phone phone = phoneRepository.findByIdAndStatus(id, "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));
        return toDetailDto(phone);
    }

    /**
     * Get phone detail by URL slug (e.g. "iphone-15-pro-max").
     */
    public PhoneDetailDTO getPhoneDetailBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResourceNotFoundException("Phone", "slug", slug);
        }
        String cleanSlug = slug.trim().toLowerCase();
        Phone phone = phoneRepository.findBySlugAndStatus(cleanSlug, "ACTIVE")
                .orElseGet(() -> phoneRepository.findAll().stream()
                        .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                        .filter(p -> toSlug(p.getName()).equalsIgnoreCase(cleanSlug))
                        .findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Phone", "slug", slug)));

        return toDetailDto(phone);
    }

    /**
     * Get all active variants with stock quantity for a specific phone.
     */
    public List<PhoneVariantDTO> getPhoneVariants(Long phoneId) {
        phoneRepository.findByIdAndStatus(phoneId, "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", phoneId));

        List<PhoneVariant> variants = phoneVariantRepository.findByPhoneIdAndStatus(phoneId, "ACTIVE");
        return phoneVariantMapper.toDtoList(variants);
    }

    public PageResponse<PhoneDTO> search(String query, List<Long> brandIds, List<String> rams,
                                         List<String> storages, List<String> colors, List<String> features,
                                         BigDecimal minPrice, BigDecimal maxPrice,
                                         String sort, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize());

        Specification<Phone> spec = buildSpec(query, brandIds, rams, storages, colors, features, minPrice, maxPrice, sort);

        Page<Phone> page = phoneRepository.findAll(spec, pageable);
        List<PhoneDTO> dtos = page.getContent().stream()
                .map(this::toListingDto)
                .toList();

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    /**
     * Unified filter Specification shared by /phones and /phones/search.
     */
    private Specification<Phone> buildSpec(String query, List<Long> brandIds, List<String> rams,
                                           List<String> storages, List<String> colors, List<String> features,
                                           BigDecimal minPrice, BigDecimal maxPrice, String sort) {
        return (root, cq, cb) -> {
            jakarta.persistence.criteria.Join<Phone, com.re.greenphone.entity.PhoneVariant> variants = null;
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();

            // Chỉ hiển thị sản phẩm đang hoạt động (admin toggle ACTIVE/INACTIVE)
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));

            if (query != null && !query.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + query.toLowerCase() + "%"));
            }
            if (brandIds != null && !brandIds.isEmpty()) {
                predicates.add(root.get("brand").get("id").in(brandIds));
            }
            if (rams != null && !rams.isEmpty()) {
                variants = variants != null ? variants : root.join("variants");
                predicates.add(variants.join("ramItem").get("value").in(rams));
            }
            if (storages != null && !storages.isEmpty()) {
                variants = variants != null ? variants : root.join("variants");
                predicates.add(variants.join("storageItem").get("value").in(storages));
            }
            if (colors != null && !colors.isEmpty()) {
                variants = variants != null ? variants : root.join("variants");
                predicates.add(variants.join("colorItem").get("value").in(colors));
            }
            if (features != null && !features.isEmpty()) {
                for (String f : features) {
                    predicates.add(cb.like(cb.lower(root.get("description")), "%" + f.toLowerCase() + "%"));
                }
            }
            if (minPrice != null) {
                variants = variants != null ? variants : root.join("variants");
                predicates.add(cb.greaterThanOrEqualTo(
                        cb.coalesce(variants.get("discountPrice"), variants.get("price")), minPrice));
            }
            if (maxPrice != null) {
                variants = variants != null ? variants : root.join("variants");
                predicates.add(cb.lessThanOrEqualTo(
                        cb.coalesce(variants.get("discountPrice"), variants.get("price")), maxPrice));
            }

            if (variants != null) cq.distinct(true);

            if (sort != null && !sort.isBlank()) {
                jakarta.persistence.criteria.Expression<?> sortExpr;
                boolean asc = true;
                switch (sort) {
                    case "price-asc" -> { sortExpr = variants != null ? variants.get("price") : root.get("id"); }
                    case "price-desc" -> { sortExpr = variants != null ? variants.get("price") : root.get("id"); asc = false; }
                    case "name" -> { sortExpr = root.get("name"); }
                    case "discount" -> {
                        variants = variants != null ? variants : root.join("variants");
                        sortExpr = cb.diff(variants.get("price"),
                                cb.coalesce(variants.get("discountPrice"), variants.get("price")));
                        asc = false;
                    }
                    default -> { sortExpr = root.get("id"); asc = false; }
                }
                cq.orderBy(asc ? cb.asc(sortExpr) : cb.desc(sortExpr));
            } else {
                cq.orderBy(cb.desc(root.get("id")));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
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
     * Maps Phone entity to PhoneDetailDTO with specs, Cloudinary images,
     * OptionItem-resolved variants (RAM, ROM, Color, realtime stock), and review stats.
     */
    private PhoneDetailDTO toDetailDto(Phone phone) {
        PhoneDetailDTO dto = new PhoneDetailDTO();
        dto.setId(phone.getId());
        dto.setSlug(toSlug(phone.getName()));
        dto.setBrandId(phone.getBrand() != null ? phone.getBrand().getId() : null);
        dto.setBrandName(phone.getBrand() != null ? phone.getBrand().getName() : null);
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
        dto.setMainImageUrl(getMainImageUrl(phone));

        // Images gallery from Cloudinary / storage
        dto.setImages(phoneImageMapper.toDtoList(phone.getImages()));

        // Active variants with resolved OptionItems (RAM, Storage, Color) & realtime stock
        List<PhoneVariant> activeVariants = phone.getVariants() != null
                ? phone.getVariants().stream()
                        .filter(v -> v.getStatus() == null || "ACTIVE".equalsIgnoreCase(v.getStatus()))
                        .toList()
                : Collections.emptyList();
        dto.setVariants(phoneVariantMapper.toDtoList(activeVariants));

        // Review ratings and count
        dto.setAvgRating(calculateAvgRating(phone));
        dto.setReviewCount(countReviews(phone));

        return dto;
    }

    private String toSlug(String name) {
        if (name == null) return "";
        return name.trim().toLowerCase().replaceAll("\\s+", "-");
    }

    /**
     * Maps a Phone entity to a PhoneDTO for listing pages.
     */
    private PhoneDTO toListingDto(Phone phone) {
        PhoneDTO dto = phoneMapper.toDto(phone);
        dto.setMainImageUrl(getMainImageUrl(phone));
        dto.setVariantCount((long) (phone.getVariants() != null ? phone.getVariants().size() : 0));
        dto.setAvgRating(calculateAvgRating(phone));
        dto.setLowestPrice(getLowestPrice(phone));
        return dto;
    }

    private Long getLowestPrice(Phone phone) {
        if (phone.getVariants() == null) return null;
        return phone.getVariants().stream()
                .map(v -> v.getDiscountPrice() != null ? v.getDiscountPrice() : v.getPrice())
                .filter(java.util.Objects::nonNull)
                .map(java.math.BigDecimal::longValue)
                .min(Long::compareTo)
                .orElse(null);
    }

    private String getMainImageUrl(Phone phone) {
        List<PhoneImage> images = phone.getImages();
        if (images == null || images.isEmpty()) return null;

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
        if (phone.getReviews() == null || phone.getReviews().isEmpty()) return 0.0;
        List<Review> validReviews = phone.getReviews().stream()
                .filter(r -> r.getStatus() == null || "SHOW".equalsIgnoreCase(r.getStatus()))
                .filter(r -> r.getRating() != null && r.getRating() > 0)
                .toList();
        if (validReviews.isEmpty()) return 0.0;
        double avg = validReviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);
        return Math.round(avg * 10.0) / 10.0;
    }

    private Long countReviews(Phone phone) {
        if (phone.getReviews() == null || phone.getReviews().isEmpty()) return 0L;
        return phone.getReviews().stream()
                .filter(r -> r.getStatus() == null || "SHOW".equalsIgnoreCase(r.getStatus()))
                .count();
    }
}
