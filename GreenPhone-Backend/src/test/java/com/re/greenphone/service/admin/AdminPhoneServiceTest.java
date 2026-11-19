package com.re.greenphone.service.admin;

import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.service.CloudinaryService;
import com.re.greenphone.service.R2StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPhoneServiceTest {

    @Mock private PhoneRepository phoneRepository;
    @Mock private WarehouseStockRepository warehouseStockRepository;
    @Mock private BrandRepository brandRepository;
    @Mock private PhoneVariantRepository phoneVariantRepository;
    @Mock private PhoneImageRepository phoneImageRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private OrderDetailRepository orderDetailRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private OptionItemRepository optionItemRepository;
    @Mock private PhoneMapper phoneMapper;
    @Mock private PhoneVariantMapper phoneVariantMapper;
    @Mock private PhoneImageMapper phoneImageMapper;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private R2StorageService r2StorageService;
    @Mock private InventoryStockHistoryService inventoryStockHistoryService;

    @InjectMocks
    private AdminPhoneService adminPhoneService;

    private Phone testPhone;

    @BeforeEach
    void setUp() {
        Brand brand = Brand.builder().name("Apple").build();
        brand.setId(1L);
        testPhone = Phone.builder()
                .brand(brand)
                .name("iPhone 15 Pro")
                .status("ACTIVE")
                .variants(Collections.emptyList())
                .images(Collections.emptyList())
                .build();
        testPhone.setId(10L);

        PhoneDTO dto = new PhoneDTO();
        dto.setId(10L);
        dto.setName("iPhone 15 Pro");
        lenient().when(phoneMapper.toDto(any(Phone.class))).thenReturn(dto);
    }

    @Test
    void getPhones_withWarehouseAndLowStock_executesSpecification() {
        when(phoneRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testPhone)));

        PageRequest pageRequest = new PageRequest();
        pageRequest.setPage(0);
        pageRequest.setSize(10);
        pageRequest.setSortBy("id");
        pageRequest.setSortDir("asc");

        PageResponse<PhoneDTO> response = adminPhoneService.getPhones("iPhone", 1L, "ACTIVE", true, 2L, pageRequest);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getName()).isEqualTo("iPhone 15 Pro");
        verify(phoneRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void getPhones_allWarehouses_lowStock_executesSpecification() {
        when(phoneRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testPhone)));

        PageRequest pageRequest = new PageRequest();
        pageRequest.setPage(0);
        pageRequest.setSize(10);
        pageRequest.setSortBy("id");
        pageRequest.setSortDir("asc");

        PageResponse<PhoneDTO> response = adminPhoneService.getPhones(null, null, null, true, null, pageRequest);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        verify(phoneRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
