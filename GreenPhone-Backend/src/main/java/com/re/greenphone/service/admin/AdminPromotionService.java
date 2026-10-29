package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.PromotionRequest;
import com.re.greenphone.dto.response.PromotionDTO;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.mapper.PromotionMapper;
import com.re.greenphone.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        Page<Promotion> page;
        if (keyword != null && !keyword.isBlank()) {
            page = promotionRepository.findByCodeContainingIgnoreCaseOrNameContainingIgnoreCase(keyword, keyword, pageable);
        } else {
            page = promotionRepository.findAll(pageable);
        }
        // Lọc status sau (ACTIVE/INACTIVE) nếu có — promotion không có status column? dùng status field nếu có
        List<PromotionDTO> dtos = promotionMapper.toDtoList(page.getContent());
        if (status != null && !status.isBlank()) {
            dtos = dtos.stream().filter(d -> status.equals(d.getStatus())).toList();
        }
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Transactional(readOnly = true)
    public PromotionDTO getPromotionDetail(Long id) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));
        return promotionMapper.toDto(promo);
    }

    public PromotionDTO createPromotion(PromotionRequest request) {
        Promotion promo = Promotion.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderValue(request.getMinOrderValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        promo = promotionRepository.save(promo);
        return promotionMapper.toDto(promo);
    }

    public PromotionDTO updatePromotion(Long id, PromotionRequest request) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));

        promo.setCode(request.getCode());
        promo.setName(request.getName());
        promo.setDescription(request.getDescription());
        promo.setDiscountType(request.getDiscountType());
        promo.setDiscountValue(request.getDiscountValue());
        promo.setMinOrderValue(request.getMinOrderValue());
        promo.setMaxDiscountAmount(request.getMaxDiscountAmount());
        promo.setStartDate(request.getStartDate());
        promo.setEndDate(request.getEndDate());

        promo = promotionRepository.save(promo);
        return promotionMapper.toDto(promo);
    }

    public void deletePromotion(Long id) {
        Promotion promo = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion", "id", id));
        promotionRepository.delete(promo);
    }
}
