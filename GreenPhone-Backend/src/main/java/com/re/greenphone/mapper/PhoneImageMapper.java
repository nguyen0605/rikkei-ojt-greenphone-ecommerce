package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.PhoneImageDTO;
import com.re.greenphone.entity.PhoneImage;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PhoneImageMapper extends GenericMapper<PhoneImage, PhoneImageDTO> {

    @Override
    PhoneImageDTO toDto(PhoneImage entity);
}
