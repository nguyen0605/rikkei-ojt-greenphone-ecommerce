package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.PromotionRequest;
import com.re.greenphone.dto.response.PromotionDTO;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.mapper.PromotionMapper;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPromotionServiceTest {

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private UserPromotionRepository userPromotionRepository;

    @Mock
    private PromotionMapper promotionMapper;

    @InjectMocks
    private AdminPromotionService adminPromotionService;

    @Test
    @DisplayName("Admin tạo Promotion thành công với số lượng phát hành và trạng thái")
    void createPromotion_Success() {
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(10);
        PromotionRequest request = PromotionRequest.builder()
                .code("SUMMER2026")
                .name("Ưu đãi hè")
                .description("Giảm giá điện thoại mùa hè")
                .discountType("PERCENT")
                .discountValue(new BigDecimal("15.00"))
                .maxDiscountAmount(new BigDecimal("100000.00"))
                .minOrderValue(new BigDecimal("2000000.00"))
                .quantity(50)
                .startDate(start)
                .endDate(end)
                .status("ACTIVE")
                .build();

        when(promotionRepository.findByCode("SUMMER2026")).thenReturn(Optional.empty());
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(inv -> {
            Promotion p = inv.getArgument(0);
            p.setId(100L);
            return p;
        });
        when(promotionMapper.toDto(any(Promotion.class))).thenAnswer(inv -> {
            Promotion p = inv.getArgument(0);
            return PromotionDTO.builder()
                    .id(p.getId())
                    .code(p.getCode())
                    .name(p.getName())
                    .quantity(p.getQuantity())
                    .status(p.getStatus())
                    .build();
        });

        PromotionDTO result = adminPromotionService.createPromotion(request);

        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("SUMMER2026");
        assertThat(result.getQuantity()).isEqualTo(50);
        verify(promotionRepository).save(argThat(p ->
                p.getQuantity() == 50 &&
                p.getClaimedQuantity() == 0 &&
                p.getUsedQuantity() == 0 &&
                "ACTIVE".equals(p.getStatus())
        ));
    }

    @Test
    @DisplayName("Admin tạo Promotion bị trùng mã code -> Ném BadRequestException")
    void createPromotion_DuplicateCode_ThrowsBadRequest() {
        PromotionRequest request = PromotionRequest.builder()
                .code("EXISTING_CODE")
                .name("Khuyến mãi")
                .discountType("FIXED")
                .discountValue(new BigDecimal("50000.00"))
                .startDate(LocalDateTime.now().plusDays(1))
                .endDate(LocalDateTime.now().plusDays(5))
                .build();

        when(promotionRepository.findByCode("EXISTING_CODE")).thenReturn(Optional.of(new Promotion()));

        assertThrows(BadRequestException.class, () -> adminPromotionService.createPromotion(request));
        verify(promotionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin tạo Promotion ngày kết thúc trước ngày bắt đầu -> Ném BadRequestException")
    void createPromotion_InvalidDateRange_ThrowsBadRequest() {
        PromotionRequest request = PromotionRequest.builder()
                .code("NEWCODE")
                .name("Khuyến mãi")
                .discountType("FIXED")
                .discountValue(new BigDecimal("50000.00"))
                .startDate(LocalDateTime.now().plusDays(5))
                .endDate(LocalDateTime.now().plusDays(1))
                .build();

        assertThrows(BadRequestException.class, () -> adminPromotionService.createPromotion(request));
    }

    @Test
    @DisplayName("Admin tạo Promotion chiết khấu phần trăm > 100% -> Ném BadRequestException")
    void createPromotion_PercentOver100_ThrowsBadRequest() {
        PromotionRequest request = PromotionRequest.builder()
                .code("OVER100")
                .name("Khuyến mãi")
                .discountType("PERCENT")
                .discountValue(new BigDecimal("120.00"))
                .startDate(LocalDateTime.now().plusDays(1))
                .endDate(LocalDateTime.now().plusDays(5))
                .build();

        assertThrows(BadRequestException.class, () -> adminPromotionService.createPromotion(request));
    }

    @Test
    @DisplayName("Admin cập nhật Promotion cập nhật cả số lượng phát hành")
    void updatePromotion_Success() {
        Promotion existing = Promotion.builder()
                .code("SALE10")
                .name("Cũ")
                .quantity(10)
                .discountType("FIXED")
                .discountValue(new BigDecimal("10000.00"))
                .startDate(LocalDateTime.now().plusDays(1))
                .endDate(LocalDateTime.now().plusDays(5))
                .build();
        existing.setId(1L);

        PromotionRequest updateReq = PromotionRequest.builder()
                .code("SALE10")
                .name("Mới")
                .quantity(100)
                .discountType("FIXED")
                .discountValue(new BigDecimal("20000.00"))
                .startDate(LocalDateTime.now().plusDays(1))
                .endDate(LocalDateTime.now().plusDays(5))
                .status("ACTIVE")
                .build();

        when(promotionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(promotionRepository.save(any(Promotion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(promotionMapper.toDto(any(Promotion.class))).thenReturn(PromotionDTO.builder().id(1L).quantity(100).build());

        PromotionDTO result = adminPromotionService.updatePromotion(1L, updateReq);

        assertThat(result.getQuantity()).isEqualTo(100);
        assertThat(existing.getQuantity()).isEqualTo(100);
    }

    @Test
    @DisplayName("Admin truy vấn phân trang Promotion gọi searchPromotions ở database")
    void getPromotions_UsesDatabaseQuery() {
        PageRequest pageRequest = new PageRequest();
        pageRequest.setPage(0);
        pageRequest.setSize(10);
        pageRequest.setSortBy("createdAt");
        pageRequest.setSortDir("DESC");

        Promotion promo = Promotion.builder().code("CODE1").name("Name 1").build();
        when(promotionRepository.searchPromotions(eq("CODE1"), eq("ACTIVE"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(promo)));
        when(promotionMapper.toDtoList(anyList()))
                .thenReturn(List.of(PromotionDTO.builder().code("CODE1").name("Name 1").build()));

        PageResponse<PromotionDTO> response = adminPromotionService.getPromotions("CODE1", "ACTIVE", pageRequest);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("Admin xóa Promotion đã có người nhận -> Soft delete chuyển INACTIVE")
    void deletePromotion_WhenReferenced_SoftDelete() {
        Promotion promo = Promotion.builder().code("VOUCHER1").status("ACTIVE").build();
        promo.setId(10L);

        when(promotionRepository.findById(10L)).thenReturn(Optional.of(promo));
        when(userPromotionRepository.existsByPromotionId(10L)).thenReturn(true);

        adminPromotionService.deletePromotion(10L);

        assertThat(promo.getStatus()).isEqualTo("INACTIVE");
        verify(promotionRepository).save(promo);
        verify(promotionRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Admin xóa Promotion chưa ai nhận -> Hard delete khỏi database")
    void deletePromotion_WhenNotReferenced_HardDelete() {
        Promotion promo = Promotion.builder().code("VOUCHER2").status("ACTIVE").build();
        promo.setId(20L);

        when(promotionRepository.findById(20L)).thenReturn(Optional.of(promo));
        when(userPromotionRepository.existsByPromotionId(20L)).thenReturn(false);

        adminPromotionService.deletePromotion(20L);

        verify(promotionRepository).delete(promo);
        verify(promotionRepository, never()).save(any());
    }
}

