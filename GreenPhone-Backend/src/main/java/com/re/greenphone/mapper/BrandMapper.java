package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.BrandDTO;
import com.re.greenphone.entity.Brand;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BrandMapper extends GenericMapper<Brand, BrandDTO> {

    @Override
    BrandDTO toDto(Brand entity);
}
