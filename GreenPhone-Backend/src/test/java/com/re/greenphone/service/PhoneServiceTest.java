package com.re.greenphone.service;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.BrandFilterDTO;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.PhoneRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhoneServiceTest {

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

    private Brand brandApple;
    private Phone phone15Pro;
    private PhoneVariant variant256GB;
    private PhoneImage mainImage;

    @BeforeEach
    void setUp() {
        brandApple = Brand.builder()
                .name("Apple")
                .status("ACTIVE")
                .build();
        brandApple.setId(1L);

        phone15Pro = Phone.builder()
                .brand(brandApple)
                .name("iPhone 15 Pro Max")
                .description("Titan tự nhiên chip A17 Pro camera 48MP zoom 5x")
                .status("ACTIVE")
                .variants(new ArrayList<>())
                .images(new ArrayList<>())
                .reviews(new ArrayList<>())
                .build();
        phone15Pro.setId(10L);

        OptionItem ramItem = OptionItem.builder().value("8GB").build();
        OptionItem storageItem = OptionItem.builder().value("256GB").build();
        OptionItem colorItem = OptionItem.builder().value("Titan").build();

        variant256GB = PhoneVariant.builder()
                .phone(phone15Pro)
                .ramItem(ramItem)
                .storageItem(storageItem)
                .colorItem(colorItem)
                .price(new BigDecimal("34990000"))
                .discountPrice(new BigDecimal("29990000"))
                .stockQuantity(50)
                .sku("IP15PM-256-NAT")
                .status("ACTIVE")
                .build();
        variant256GB.setId(100L);
        phone15Pro.getVariants().add(variant256GB);

        mainImage = PhoneImage.builder()
                .phone(phone15Pro)
                .imageUrl("https://images.pexels.com/photos/123/phone.jpg")
                .isMain(true)
                .sortOrder(1)
                .build();
        phone15Pro.getImages().add(mainImage);
    }

    @Test
    @DisplayName("BE2-01: Truy vấn danh mục smartphone lọc đa tiêu chí (Brand, RAM, Storage, Color, Price) thành công")
    void getPhones_withMultiCriteriaFilter_success() {
        // Arrange
        Page<Phone> mockPage = new PageImpl<>(List.of(phone15Pro));
        when(phoneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);

        PhoneDTO mockDto = new PhoneDTO();
        mockDto.setId(10L);
        mockDto.setName("iPhone 15 Pro Max");
        when(phoneMapper.toDto(any(Phone.class))).thenReturn(mockDto);

        List<Long> brandIds = List.of(1L);
        List<String> rams = List.of("8GB");
        List<String> storages = List.of("256GB");
        List<String> colors = List.of("Titan");
        List<String> features = List.of("A17 Pro", "zoom 5x");
        BigDecimal minPrice = new BigDecimal("25000000");
        BigDecimal maxPrice = new BigDecimal("35000000");
        String sort = "price-asc";
        PageRequest pageRequest = new PageRequest(0, 12, "id", "desc");

        // Act
        PageResponse<PhoneDTO> response = phoneService.getPhones(
                brandIds, rams, storages, colors, features, minPrice, maxPrice, sort, pageRequest);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        PhoneDTO item = response.getContent().get(0);
        assertThat(item.getId()).isEqualTo(10L);
        assertThat(item.getLowestPrice()).isEqualTo(29990000L);
        assertThat(item.getVariantCount()).isEqualTo(1L);
        assertThat(item.getMainImageUrl()).contains("auto=compress");

        verify(phoneRepository, times(1)).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("BE2-01: Hỗ trợ phân trang chuẩn Pageable và các kiểu sắp xếp đa chiều (newest, bestseller, discount)")
    void getPhones_withDiverseSortingOptions_success() {
        Page<Phone> mockPage = new PageImpl<>(List.of(phone15Pro));
        when(phoneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);
        when(phoneMapper.toDto(any(Phone.class))).thenReturn(new PhoneDTO());

        PageRequest pageRequest = new PageRequest(0, 10, "id", "desc");

        // Test newest
        PageResponse<PhoneDTO> resNewest = phoneService.getPhones(
                null, null, null, null, null, null, null, "newest", pageRequest);
        assertThat(resNewest.getContent()).isNotEmpty();

        // Test bestseller
        PageResponse<PhoneDTO> resBestseller = phoneService.getPhones(
                null, null, null, null, null, null, null, "bestseller", pageRequest);
        assertThat(resBestseller.getContent()).isNotEmpty();

        // Test discount
        PageResponse<PhoneDTO> resDiscount = phoneService.getPhones(
                null, null, null, null, null, null, null, "discount", pageRequest);
        assertThat(resDiscount.getContent()).isNotEmpty();

        // Test price-desc
        PageResponse<PhoneDTO> resPriceDesc = phoneService.getPhones(
                null, null, null, null, null, null, null, "price-desc", pageRequest);
        assertThat(resPriceDesc.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("BE2-01: Tìm kiếm smartphone kết hợp bộ lọc từ khóa và cấu hình linh hoạt")
    void search_withQueryAndFilters_success() {
        Page<Phone> mockPage = new PageImpl<>(List.of(phone15Pro));
        when(phoneRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);

        PhoneDTO mockDto = new PhoneDTO();
        mockDto.setId(10L);
        mockDto.setName("iPhone 15 Pro Max");
        when(phoneMapper.toDto(any(Phone.class))).thenReturn(mockDto);

        PageRequest pageRequest = new PageRequest(0, 10, "id", "desc");

        PageResponse<PhoneDTO> response = phoneService.search(
                "iPhone", List.of(1L), List.of("8GB"), null, null, null, null, null, "name", pageRequest);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        verify(phoneRepository, times(1)).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("BE2-01: Xem chi tiết sản phẩm ACTIVE thành công")
    void getPhoneDetail_activePhone_success() {
        when(phoneRepository.findByIdAndStatus(10L, "ACTIVE")).thenReturn(Optional.of(phone15Pro));
        when(phoneImageMapper.toDtoList(any())).thenReturn(List.of());
        when(phoneVariantMapper.toDtoList(any())).thenReturn(List.of());

        PhoneDetailDTO detail = phoneService.getPhoneDetail(10L);

        assertThat(detail).isNotNull();
        assertThat(detail.getId()).isEqualTo(10L);
        assertThat(detail.getName()).isEqualTo("iPhone 15 Pro Max");
        assertThat(detail.getBrandName()).isEqualTo("Apple");
    }

    @Test
    @DisplayName("BE2-01: Xem chi tiết sản phẩm không tồn tại hoặc INACTIVE ném ResourceNotFoundException")
    void getPhoneDetail_inactivePhone_throwsResourceNotFound() {
        when(phoneRepository.findByIdAndStatus(99L, "ACTIVE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> phoneService.getPhoneDetail(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("BE2-01: Lấy danh sách thương hiệu phục vụ bộ lọc dropdown không bị N+1")
    void getFilters_returnsBrandList() {
        when(phoneRepository.findDistinctBrands()).thenReturn(List.of(
                new BrandFilterDTO(1L, "Apple"),
                new BrandFilterDTO(2L, "Samsung")
        ));

        Map<String, Object> filters = phoneService.getFilters();

        assertThat(filters).containsKey("brands");
        List<?> brands = (List<?>) filters.get("brands");
        assertThat(brands).hasSize(2);
    }

    @Test
    @DisplayName("BE3-03: Tìm kiếm Full-Text Search khi chỉ có từ khóa query")
    void search_fullTextSearch_whenQueryOnly() {
        Page<Phone> page = new PageImpl<>(List.of(phone15Pro));
        when(phoneRepository.searchFullText(eq("+Titan*"), any(Pageable.class))).thenReturn(page);
        when(phoneMapper.toDto(phone15Pro)).thenReturn(PhoneDTO.builder().id(10L).name("iPhone 15 Pro Max").build());

        PageRequest pageRequest = new PageRequest();
        pageRequest.setPage(0);
        pageRequest.setSize(10);

        PageResponse<PhoneDTO> res = phoneService.search("Titan", null, null, null, null, null, null, null, null, pageRequest);

        assertThat(res).isNotNull();
        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getContent().get(0).getName()).isEqualTo("iPhone 15 Pro Max");
        verify(phoneRepository).searchFullText(eq("+Titan*"), any(Pageable.class));
        verify(phoneRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("BE3-03: Chuyển đổi chuỗi sang Boolean Search Term chuẩn")
    void toBooleanSearchTerm_convertsProperly() {
        assertThat(PhoneService.toBooleanSearchTerm("Titan")).isEqualTo("+Titan*");
        assertThat(PhoneService.toBooleanSearchTerm("iPhone 15")).isEqualTo("+iPhone* +15*");
        assertThat(PhoneService.toBooleanSearchTerm("  ")).isEqualTo("");
        assertThat(PhoneService.toBooleanSearchTerm("+Titan*~<>()@")).isEqualTo("+Titan*");
    }
}
