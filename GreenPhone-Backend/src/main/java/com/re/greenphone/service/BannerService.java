package com.re.greenphone.service;

import com.re.greenphone.dto.response.BannerDTO;
import com.re.greenphone.mapper.BannerMapper;
import com.re.greenphone.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BannerService {

    private final BannerRepository bannerRepository;
    private final BannerMapper bannerMapper;

    public List<BannerDTO> getActiveBanners() {
        return bannerMapper.toDtoList(bannerRepository.findByStatus("ACTIVE"));
    }
}
