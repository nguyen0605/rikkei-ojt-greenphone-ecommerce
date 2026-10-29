package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.PromotionDTO;
import com.re.greenphone.entity.Promotion;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PromotionMapper extends GenericMapper<Promotion, PromotionDTO> {

    @Override
    PromotionDTO toDto(Promotion entity);
}
