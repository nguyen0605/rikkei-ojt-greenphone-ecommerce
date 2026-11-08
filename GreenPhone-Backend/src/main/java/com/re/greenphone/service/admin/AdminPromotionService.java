package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.PromotionRequest;
import com.re.greenphone.dto.response.PromotionDTO;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.mapper.PromotionMapper;
import com.re.greenphone.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminPromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionMapper promotionMapper;

    @Transactional(readOnly = true)
    public PageResponse<PromotionDTO> getPromotions(String keyword, String status,
                                                    com.re.greenphone.common.pagination.PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.fromString(pageRequest.getSortDir()), pageRequest.getSortBy()));

        Page<Promotion> page = promotionRepository.searchPromotions(keyword, status, pageable);
        List<PromotionDTO> dtos = promotionMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Transactional(readOnly = true)
    public PromotionDTO getPromotionDetail(Long id) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));
        return promotionMapper.toDto(promo);
    }

    @CacheEvict(value = "promotions", allEntries = true)
    public PromotionDTO createPromotion(PromotionRequest request) {
        validatePromotionRequest(request);

        String code = request.getCode().trim().toUpperCase();
        if (promotionRepository.findByCode(code).isPresent()) {
            throw new BadRequestException("Mã khuyến mãi '" + code + "' đã tồn tại trên hệ thống");
        }

        Promotion promo = Promotion.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderValue(request.getMinOrderValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .quantity(request.getQuantity() != null ? request.getQuantity() : 0)
                .claimedQuantity(0)
                .usedQuantity(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus() : "ACTIVE")
                .build();

        promo = promotionRepository.save(promo);
        return promotionMapper.toDto(promo);
    }

    @CacheEvict(value = "promotions", allEntries = true)
    public PromotionDTO updatePromotion(Long id, PromotionRequest request) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));

        validatePromotionRequest(request);

        String code = request.getCode().trim().toUpperCase();
        if (!promo.getCode().equalsIgnoreCase(code) && promotionRepository.findByCode(code).isPresent()) {
            throw new BadRequestException("Mã khuyến mãi '" + code + "' đã tồn tại trên hệ thống");
        }

        promo.setCode(code);
        promo.setName(request.getName().trim());
        promo.setDescription(request.getDescription());
        promo.setDiscountType(request.getDiscountType());
        promo.setDiscountValue(request.getDiscountValue());
        promo.setMinOrderValue(request.getMinOrderValue());
        promo.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getQuantity() != null) {
            promo.setQuantity(request.getQuantity());
        }
        promo.setStartDate(request.getStartDate());
        promo.setEndDate(request.getEndDate());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            promo.setStatus(request.getStatus());
        }

        promo = promotionRepository.save(promo);
        return promotionMapper.toDto(promo);
    }

    private void validatePromotionRequest(PromotionRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && !request.getEndDate().isAfter(request.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        if ("PERCENT".equals(request.getDiscountType())) {
            if (request.getDiscountValue() == null
                    || request.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0
                    || request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Phần trăm giảm giá phải lớn hơn 0 và không vượt quá 100%");
            }
        } else if ("FIXED".equals(request.getDiscountType())) {
            if (request.getDiscountValue() == null || request.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Số tiền giảm giá cố định phải lớn hơn 0");
            }
        }
    }

    @CacheEvict(value = "promotions", allEntries = true)
    public void deletePromotion(Long id) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));
        promotionRepository.delete(promo);
    }
}
