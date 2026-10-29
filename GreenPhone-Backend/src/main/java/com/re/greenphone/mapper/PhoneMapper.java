package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.entity.Phone;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PhoneMapper extends GenericMapper<Phone, PhoneDTO> {

    @Override
    @Mapping(source = "brand.id", target = "brandId")
    @Mapping(source = "brand.name", target = "brandName")
    @Mapping(target = "mainImageUrl", ignore = true)
    @Mapping(target = "variantCount", ignore = true)
    @Mapping(target = "avgRating", ignore = true)
    PhoneDTO toDto(Phone entity);
}
