package com.re.greenphone.service.admin;

import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.mapper.BrandMapper;
import com.re.greenphone.repository.BrandRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.service.BrandService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminBrandStatusCascadeTest {

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private PhoneRepository phoneRepository;

    @Mock
    private BrandMapper brandMapper;

    @Mock
    private BrandService brandService;

    @InjectMocks
    private AdminBrandService adminBrandService;

    @Test
    @DisplayName("Cập nhật trạng thái Hãng sang INACTIVE tự động cascade cập nhật toàn bộ sản phẩm liên quan")
    void testUpdateStatusToInactiveCascadesToPhones() {
        Long brandId = 1L;
        Brand brand = Brand.builder().name("Samsung").status("ACTIVE").build();
        brand.setId(brandId);

        when(brandRepository.findById(brandId)).thenReturn(Optional.of(brand));
        when(brandRepository.save(any(Brand.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(phoneRepository.updateStatusByBrandId(brandId, "INACTIVE")).thenReturn(5);

        BrandDTO expectedDto = new BrandDTO();
        expectedDto.setId(brandId);
        expectedDto.setName("Samsung");
        expectedDto.setStatus("INACTIVE");
        when(brandMapper.toDto(any(Brand.class))).thenReturn(expectedDto);

        BrandDTO result = adminBrandService.updateStatus(brandId, "INACTIVE");

        assertNotNull(result);
        assertEquals("INACTIVE", result.getStatus());
        verify(phoneRepository, times(1)).updateStatusByBrandId(brandId, "INACTIVE");
        verify(brandService, times(1)).resolveBrandLogo(result);
    }

    @Test
    @DisplayName("Cập nhật trạng thái Hãng với giá trị không hợp lệ sẽ ném ngoại lệ BadRequestException")
    void testUpdateStatusInvalidThrowsBadRequest() {
        Long brandId = 1L;
        assertThrows(BadRequestException.class, () -> adminBrandService.updateStatus(brandId, "PENDING"));
        verify(brandRepository, never()).findById(any());
        verify(phoneRepository, never()).updateStatusByBrandId(any(), any());
    }

    @Test
    @DisplayName("Cập nhật trạng thái Hãng không tồn tại sẽ ném ngoại lệ ResourceNotFoundException")
    void testUpdateStatusNotFoundThrowsException() {
        Long brandId = 999L;
        when(brandRepository.findById(brandId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminBrandService.updateStatus(brandId, "INACTIVE"));
        verify(phoneRepository, never()).updateStatusByBrandId(any(), any());
    }
}
