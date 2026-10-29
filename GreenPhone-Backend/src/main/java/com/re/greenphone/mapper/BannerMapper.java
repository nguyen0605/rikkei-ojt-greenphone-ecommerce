package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.BannerDTO;
import com.re.greenphone.entity.Banner;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BannerMapper extends GenericMapper<Banner, BannerDTO> {

    @Override
    BannerDTO toDto(Banner entity);
}
