package com.re.greenphone.mapper;

import com.re.greenphone.dto.response.OptionItemDTO;
import com.re.greenphone.entity.OptionItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OptionItemMapper {

    @Mapping(source = "option.id", target = "optionId")
    @Mapping(source = "option.type", target = "optionType")
    OptionItemDTO toDto(OptionItem entity);

    java.util.List<OptionItemDTO> toDtoList(java.util.List<OptionItem> entities);
}
