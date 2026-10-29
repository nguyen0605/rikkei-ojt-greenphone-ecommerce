package com.re.greenphone.service;

import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.mapper.BrandMapper;
import com.re.greenphone.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;

    public List<BrandDTO> getAllBrands() {
        // Chỉ hiển thị hãng đang hoạt động trong store (admin toggle ACTIVE/INACTIVE)
        return brandMapper.toDtoList(brandRepository.findByStatus("ACTIVE"));
    }
}
