package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.UserPromotion;
import com.re.greenphone.mapper.UserPromotionMapper;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
class PromotionServiceTest {

    @Mock private UserPromotionRepository userPromotionRepository;
    @Mock private PromotionRepository promotionRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserPromotionMapper userPromotionMapper;

    @InjectMocks
    private PromotionService promotionService;

    private User testUser;
    private Promotion activePromo;
    private Promotion expiredPromo;
    private Promotion percentPromo;
    private Promotion fixedPromo;
    private UserPromotion upActive;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");

        activePromo = Promotion.builder()
                .code("SUMMER25")
                .name("Summer Sale 25%")
                .discountType("PERCENT")
                .discountValue(new BigDecimal("25"))
                .maxDiscountAmount(new BigDecimal("500000"))
                .minOrderValue(new BigDecimal("1000000"))
                .startDate(LocalDateTime.now().minusDays(1))
                .endDate(LocalDateTime.now().plusDays(30))
                .build();
        activePromo.setId(10L);

        expiredPromo = Promotion.builder()
                .code("EXPIRED10")
                .name("Expired")
                .discountType("FIXED")
                .discountValue(new BigDecimal("100000"))
                .startDate(LocalDateTime.now().minusDays(30))
                .endDate(LocalDateTime.now().minusDays(1))
                .build();
        expiredPromo.setId(11L);

        percentPromo = Promotion.builder()
                .code("PERCENT50")
                .name("50% Off")
                .discountType("PERCENT")
                .discountValue(new BigDecimal("50"))
                .maxDiscountAmount(new BigDecimal("2000000"))
                .minOrderValue(null)
                .startDate(LocalDateTime.now().minusDays(1))
                .endDate(LocalDateTime.now().plusDays(30))
                .build();
        percentPromo.setId(12L);

        fixedPromo = Promotion.builder()
                .code("FIXED100K")
                .name("100K Off")
                .discountType("FIXED")
                .discountValue(new BigDecimal("100000"))
                .maxDiscountAmount(null)
                .minOrderValue(new BigDecimal("500000"))
                .startDate(LocalDateTime.now().minusDays(1))
                .endDate(LocalDateTime.now().plusDays(30))
                .build();
        fixedPromo.setId(13L);

        upActive = UserPromotion.builder()
                .user(testUser)
                .promotion(activePromo)
                .status("AVAILABLE")
                .build();
        upActive.setId(100L);
    }

    // === GET AVAILABLE PROMOTIONS ===

    @Test
    void getAvailablePromotions_PercentDiscount() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upActive));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("2000000"));

            assertThat(results).hasSize(1);
            Map<String, Object> result = results.get(0);
            assertThat(result).containsEntry("code", "SUMMER25");
            assertThat(result).containsEntry("eligible", true);
            BigDecimal calcDiscount = (BigDecimal) result.get("calculatedDiscount");
            // 25% of 2,000,000 = 500,000; capped at 500,000
            assertThat(calcDiscount).isEqualByComparingTo(new BigDecimal("500000"));
        }
    }

    @Test
    void getAvailablePromotions_FixedDiscount() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            UserPromotion upFixed = UserPromotion.builder()
                    .user(testUser)
                    .promotion(fixedPromo)
                    .status("AVAILABLE")
                    .build();
            upFixed.setId(101L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upFixed));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("2000000"));

            assertThat(results).hasSize(1);
            BigDecimal calcDiscount = (BigDecimal) results.get(0).get("calculatedDiscount");
            assertThat(calcDiscount).isEqualByComparingTo(new BigDecimal("100000"));
        }
    }

    @Test
    void getAvailablePromotions_ExpiredPromo_NotEligible() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            UserPromotion upExpired = UserPromotion.builder()
                    .user(testUser)
                    .promotion(expiredPromo)
                    .status("AVAILABLE")
                    .build();
            upExpired.setId(102L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upExpired));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("2000000"));

            assertThat(results).hasSize(1);
            assertThat(results.get(0)).containsEntry("eligible", false);
        }
    }

    @Test
    void getAvailablePromotions_MinOrderNotMet_NotEligible() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upActive));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("500000"));

            assertThat(results).hasSize(1);
            assertThat(results.get(0)).containsEntry("eligible", false);
        }
    }

    @Test
    void getAvailablePromotions_FixedDiscountExceedsOrder() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            UserPromotion upFixed = UserPromotion.builder()
                    .user(testUser)
                    .promotion(fixedPromo)
                    .status("AVAILABLE")
                    .build();
            upFixed.setId(103L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upFixed));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("50000"));

            BigDecimal calcDiscount = (BigDecimal) results.get(0).get("calculatedDiscount");
            // 300000 > 50000, should be capped at order amount
            assertThat(calcDiscount).isEqualByComparingTo(new BigDecimal("50000"));
        }
    }

    @Test
    void getAvailablePromotions_SortedByDescendingDiscount() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);

            UserPromotion upPercent = UserPromotion.builder()
                    .user(testUser).promotion(percentPromo).status("AVAILABLE").build();
            upPercent.setId(101L);
            UserPromotion upFixed = UserPromotion.builder()
                    .user(testUser).promotion(fixedPromo).status("AVAILABLE").build();
            upFixed.setId(102L);

            when(userPromotionRepository.findByUserIdAndStatus(1L, "AVAILABLE"))
                    .thenReturn(List.of(upFixed, upPercent));

            List<Map<String, Object>> results = promotionService.getAvailablePromotions(new BigDecimal("2000000"));

            assertThat(results).hasSize(2);
            // 50% of 2M = 1M, 100K fixed → biggest first
            BigDecimal first = (BigDecimal) results.get(0).get("calculatedDiscount");
            BigDecimal second = (BigDecimal) results.get(1).get("calculatedDiscount");
            assertThat(first.compareTo(second)).isGreaterThanOrEqualTo(0);
        }
    }

    // === CLAIM PROMOTION ===

    @Test
    void claimPromotion_Success() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(promotionRepository.findByCode("SUMMER25")).thenReturn(Optional.of(activePromo));
            when(userPromotionRepository.existsByUserIdAndPromotionId(1L, 10L)).thenReturn(false);
            when(userPromotionRepository.save(any(UserPromotion.class))).thenReturn(upActive);
            when(userPromotionMapper.toDto(upActive)).thenReturn(null); // Not testing mapper output

            promotionService.claimPromotion("SUMMER25");

            verify(userPromotionRepository).save(any(UserPromotion.class));
        }
    }

    @Test
    void claimPromotion_CodeNotFound() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(promotionRepository.findByCode("INVALID")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> promotionService.claimPromotion("INVALID"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Promotion code not found");
        }
    }

    @Test
    void claimPromotion_Expired() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(promotionRepository.findByCode("EXPIRED10")).thenReturn(Optional.of(expiredPromo));

            assertThatThrownBy(() -> promotionService.claimPromotion("EXPIRED10"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("not active");
        }
    }

    @Test
    void claimPromotion_AlreadyClaimed() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(promotionRepository.findByCode("SUMMER25")).thenReturn(Optional.of(activePromo));
            when(userPromotionRepository.existsByUserIdAndPromotionId(1L, 10L)).thenReturn(true);

            assertThatThrownBy(() -> promotionService.claimPromotion("SUMMER25"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already claimed");
        }
    }
}
