package com.re.greenphone.service;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.dto.response.PhoneImageDTO;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhoneServiceTest {

    @Mock
    private PhoneRepository phoneRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private PhoneMapper phoneMapper;

    @Mock
    private PhoneVariantMapper phoneVariantMapper;

    @Mock
    private PhoneImageMapper phoneImageMapper;

    @InjectMocks
    private PhoneService phoneService;

    private Phone testPhone;
    private Brand testBrand;
    private PhoneVariant testVariant;
    private PhoneImage testImage;
    private Review testReview;

    @BeforeEach
    void setUp() {
        testBrand = Brand.builder().name("Apple").status("ACTIVE").build();
        testBrand.setId(1L);

        testPhone = Phone.builder()
                .brand(testBrand)
                .name("iPhone 15 Pro Max")
                .description("Titanium flagship")
                .screen("6.7 inch OLED")
                .os("iOS 17")
                .chip("A17 Pro")
                .rearCamera("48MP")
                .frontCamera("12MP")
                .battery("4422mAh")
                .warranty("12 months")
                .status("ACTIVE")
                .variants(new ArrayList<>())
                .images(new ArrayList<>())
                .reviews(new ArrayList<>())
                .build();
        testPhone.setId(1L);

        Option ramOpt = Option.builder().type("RAM").label("RAM").build();
        Option storageOpt = Option.builder().type("STORAGE").label("Storage").build();
        Option colorOpt = Option.builder().type("COLOR").label("Color").build();

        OptionItem ramItem = OptionItem.builder().option(ramOpt).value("8GB").build();
        OptionItem storageItem = OptionItem.builder().option(storageOpt).value("256GB").build();
        OptionItem colorItem = OptionItem.builder().option(colorOpt).value("Titanium").hexColor("#333333").build();

        testVariant = PhoneVariant.builder()
                .phone(testPhone)
                .ramItem(ramItem)
                .storageItem(storageItem)
                .colorItem(colorItem)
                .price(new BigDecimal("34990000"))
                .discountPrice(new BigDecimal("32990000"))
                .stockQuantity(15)
                .sku("IP15PM-256-TI")
                .status("ACTIVE")
                .build();
        testVariant.setId(10L);
        testPhone.getVariants().add(testVariant);

        testImage = PhoneImage.builder()
                .phone(testPhone)
                .imageUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .isMain(true)
                .sortOrder(1)
                .build();
        testImage.setId(100L);
        testPhone.getImages().add(testImage);

        testReview = Review.builder()
                .phone(testPhone)
                .rating(5)
                .content("Tuyệt vời")
                .status("SHOW")
                .build();
        testReview.setId(50L);
        testPhone.getReviews().add(testReview);
    }

    @Test
    void getPhoneDetail_Success() {
        when(phoneRepository.findByIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(testPhone));

        PhoneVariantDTO variantDTO = PhoneVariantDTO.builder()
                .id(10L)
                .phoneId(1L)
                .ram("8GB")
                .storage("256GB")
                .color("Titanium")
                .colorHex("#333333")
                .price(new BigDecimal("34990000"))
                .discountPrice(new BigDecimal("32990000"))
                .stockQuantity(15)
                .sku("IP15PM-256-TI")
                .status("ACTIVE")
                .build();
        when(phoneVariantMapper.toDtoList(anyList())).thenReturn(List.of(variantDTO));

        PhoneImageDTO imageDTO = PhoneImageDTO.builder()
                .id(100L)
                .phoneId(1L)
                .imageUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .isMain(true)
                .sortOrder(1)
                .build();
        when(phoneImageMapper.toDtoList(anyList())).thenReturn(List.of(imageDTO));

        PhoneDetailDTO result = phoneService.getPhoneDetail(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("iPhone 15 Pro Max");
        assertThat(result.getSlug()).isEqualTo("iphone-15-pro-max");
        assertThat(result.getBrandName()).isEqualTo("Apple");
        assertThat(result.getChip()).isEqualTo("A17 Pro");
        assertThat(result.getImages()).hasSize(1);
        assertThat(result.getVariants()).hasSize(1);
        assertThat(result.getVariants().get(0).getRam()).isEqualTo("8GB");
        assertThat(result.getVariants().get(0).getStorage()).isEqualTo("256GB");
        assertThat(result.getVariants().get(0).getColor()).isEqualTo("Titanium");
        assertThat(result.getVariants().get(0).getStockQuantity()).isEqualTo(15);
        assertThat(result.getAvgRating()).isEqualTo(5.0);
        assertThat(result.getReviewCount()).isEqualTo(1L);
    }

    @Test
    void getPhoneDetail_NotFound_ThrowsResourceNotFoundException() {
        when(phoneRepository.findByIdAndStatus(999L, "ACTIVE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> phoneService.getPhoneDetail(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Phone not found with id: '999'");
    }

    @Test
    void getPhoneDetailBySlug_Success() {
        when(phoneRepository.findBySlugAndStatus("iphone-15-pro-max", "ACTIVE")).thenReturn(Optional.of(testPhone));
        when(phoneVariantMapper.toDtoList(anyList())).thenReturn(List.of());
        when(phoneImageMapper.toDtoList(anyList())).thenReturn(List.of());

        PhoneDetailDTO result = phoneService.getPhoneDetailBySlug("iphone-15-pro-max");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("iPhone 15 Pro Max");
        assertThat(result.getSlug()).isEqualTo("iphone-15-pro-max");
    }

    @Test
    void getPhoneDetailBySlug_NotFound_ThrowsResourceNotFoundException() {
        when(phoneRepository.findBySlugAndStatus("non-existent-phone", "ACTIVE")).thenReturn(Optional.empty());
        when(phoneRepository.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> phoneService.getPhoneDetailBySlug("non-existent-phone"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Phone not found with slug: 'non-existent-phone'");
    }

    @Test
    void getPhoneVariants_Success() {
        when(phoneRepository.findByIdAndStatus(1L, "ACTIVE")).thenReturn(Optional.of(testPhone));
        when(phoneVariantRepository.findByPhoneIdAndStatus(1L, "ACTIVE")).thenReturn(List.of(testVariant));

        PhoneVariantDTO variantDTO = PhoneVariantDTO.builder()
                .id(10L)
                .ram("8GB")
                .storage("256GB")
                .color("Titanium")
                .price(new BigDecimal("34990000"))
                .stockQuantity(15)
                .build();
        when(phoneVariantMapper.toDtoList(List.of(testVariant))).thenReturn(List.of(variantDTO));

        List<PhoneVariantDTO> variants = phoneService.getPhoneVariants(1L);

        assertThat(variants).hasSize(1);
        assertThat(variants.get(0).getStockQuantity()).isEqualTo(15);
    }

    @Test
    void getPhoneVariants_PhoneNotFound() {
        when(phoneRepository.findByIdAndStatus(99L, "ACTIVE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> phoneService.getPhoneVariants(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Phone not found with id: '99'");
    }
}

