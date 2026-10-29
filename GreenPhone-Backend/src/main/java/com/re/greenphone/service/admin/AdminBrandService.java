package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.BrandRequest;
import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.mapper.BrandMapper;
import com.re.greenphone.repository.BrandRepository;
import com.re.greenphone.repository.PhoneRepository;
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
public class AdminBrandService {

    private final BrandRepository brandRepository;
    private final PhoneRepository phoneRepository;
    private final BrandMapper brandMapper;

    public PageResponse<BrandDTO> getBrands(String keyword,
                                            com.re.greenphone.common.pagination.PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.fromString(pageRequest.getSortDir()), pageRequest.getSortBy()));

        Page<Brand> page;
        if (keyword != null && !keyword.isBlank()) {
            page = brandRepository.findByNameContainingIgnoreCase(keyword, pageable);
        } else {
            page = brandRepository.findAll(pageable);
        }
        List<BrandDTO> dtos = brandMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public BrandDTO createBrand(BrandRequest request) {
        Brand brand = Brand.builder()
                .name(request.getName())
                .logoUrl(request.getLogoUrl())
                .status("ACTIVE")
                .build();
        brand = brandRepository.save(brand);
        return brandMapper.toDto(brand);
    }

    public BrandDTO updateBrand(Long id, BrandRequest request) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        brand.setName(request.getName());
        if (request.getLogoUrl() != null) brand.setLogoUrl(request.getLogoUrl());
        brand = brandRepository.save(brand);
        return brandMapper.toDto(brand);
    }

    /**
     * Hard-delete a brand. Blocked while any phone still references it — historical
     * phones keep the FK alive, so the brand cannot be removed. Use the status
     * toggle (INACTIVE) to hide such brands from the store instead.
     */
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        if (phoneRepository.existsByBrandId(id)) {
            throw new BadRequestException(
                    "Không thể xóa hãng đang có sản phẩm. Hãy tắt trạng thái để ẩn hãng.");
        }
        brandRepository.delete(brand);
    }

    public BrandDTO updateStatus(Long id, String status) {
        if (!List.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new BadRequestException("Invalid status: " + status);
        }
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        brand.setStatus(status);
        brand = brandRepository.save(brand);
        return brandMapper.toDto(brand);
    }
}
