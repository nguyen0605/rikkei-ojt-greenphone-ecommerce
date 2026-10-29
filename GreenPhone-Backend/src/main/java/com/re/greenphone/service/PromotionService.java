package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.UserPromotionDTO;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.UserPromotion;
import com.re.greenphone.mapper.UserPromotionMapper;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PromotionService {

    private final UserPromotionRepository userPromotionRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final UserPromotionMapper userPromotionMapper;

    public List<Map<String, Object>> getAvailablePromotions(BigDecimal orderAmount) {
        Long userId = SecurityUtils.getCurrentUserId();

        List<UserPromotion> promotions = userPromotionRepository.findByUserIdAndStatus(userId, "AVAILABLE");
        LocalDateTime now = LocalDateTime.now();

        return promotions.stream()
                .map(up -> {
                    Promotion promo = up.getPromotion();
                    boolean eligible = promo.getStartDate().isBefore(now)
                            && promo.getEndDate().isAfter(now)
                            && (promo.getMinOrderValue() == null || orderAmount.compareTo(promo.getMinOrderValue()) >= 0);

                    BigDecimal discountValue;
                    if ("PERCENT".equals(promo.getDiscountType())) {
                        BigDecimal pctDiscount = orderAmount.multiply(promo.getDiscountValue().divide(BigDecimal.valueOf(100)));
                        discountValue = promo.getMaxDiscountAmount() != null
                                && pctDiscount.compareTo(promo.getMaxDiscountAmount()) > 0
                                ? promo.getMaxDiscountAmount() : pctDiscount;
                    } else {
                        discountValue = promo.getDiscountValue().compareTo(orderAmount) > 0
                                ? orderAmount : promo.getDiscountValue();
                    }

                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("id", up.getId());
                    result.put("code", promo.getCode());
                    result.put("name", promo.getName());
                    result.put("discountType", promo.getDiscountType());
                    result.put("discountValue", promo.getDiscountValue());
                    result.put("calculatedDiscount", discountValue);
                    result.put("minOrderValue", promo.getMinOrderValue());
                    result.put("eligible", eligible);
                    result.put("endDate", promo.getEndDate());
                    return result;
                })
                .sorted(Comparator.comparing((Map<String, Object> m) -> (BigDecimal) m.get("calculatedDiscount")).reversed())
                .toList();
    }

    public List<UserPromotionDTO> getMyPromotions() {
        Long userId = SecurityUtils.getCurrentUserId();
        return userPromotionMapper.toDtoList(
                userPromotionRepository.findByUserIdOrderByReceivedAtDesc(userId));
    }

    public UserPromotionDTO claimPromotion(String code) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Promotion promo = promotionRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion code not found: " + code));

        if (promo.getStartDate().isAfter(LocalDateTime.now()) || promo.getEndDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Promotion is not active");
        }

        if (userPromotionRepository.existsByUserIdAndPromotionId(userId, promo.getId())) {
            throw new BadRequestException("You have already claimed this promotion");
        }

        UserPromotion up = UserPromotion.builder()
                .user(user)
                .promotion(promo)
                .status("AVAILABLE")
                .build();

        up = userPromotionRepository.save(up);
        return userPromotionMapper.toDto(up);
    }
}
