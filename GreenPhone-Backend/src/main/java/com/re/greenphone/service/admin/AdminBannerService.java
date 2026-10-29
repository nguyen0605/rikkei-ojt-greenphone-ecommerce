package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.BannerRequest;
import com.re.greenphone.dto.response.BannerDTO;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.entity.Banner;
import com.re.greenphone.mapper.BannerMapper;
import com.re.greenphone.repository.BannerRepository;
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
public class AdminBannerService {

    private final BannerRepository bannerRepository;
    private final BannerMapper bannerMapper;

    public PageResponse<BannerDTO> getBanners(String title,
                                              com.re.greenphone.common.pagination.PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.fromString(pageRequest.getSortDir()), pageRequest.getSortBy()));

        Page<Banner> page;
        if (title != null && !title.isBlank()) {
            page = bannerRepository.findByTitleContainingIgnoreCase(title, pageable);
        } else {
            page = bannerRepository.findAll(pageable);
        }
        List<BannerDTO> dtos = bannerMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public BannerDTO createBanner(BannerRequest request) {
        Banner banner = Banner.builder()
                .title(request.getTitle())
                .imageUrl(request.getImageUrl())
                .linkUrl(request.getLinkUrl())
                .status("ACTIVE")
                .build();

        banner = bannerRepository.save(banner);
        return bannerMapper.toDto(banner);
    }

    public BannerDTO updateBanner(Long id, BannerRequest request) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));

        banner.setTitle(request.getTitle());
        if (request.getImageUrl() != null) banner.setImageUrl(request.getImageUrl());
        banner.setLinkUrl(request.getLinkUrl());

        banner = bannerRepository.save(banner);
        return bannerMapper.toDto(banner);
    }

    public void deleteBanner(Long id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));
        banner.setStatus("INACTIVE");
        bannerRepository.save(banner);
    }
}
