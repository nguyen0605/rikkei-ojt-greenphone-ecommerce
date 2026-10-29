package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.entity.PhoneVariant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PhoneVariantMapper extends GenericMapper<PhoneVariant, PhoneVariantDTO> {

    @Override
    @Mapping(source = "phone.id", target = "phoneId")
    @Mapping(source = "ramItem.id", target = "ramItemId")
    @Mapping(source = "storageItem.id", target = "storageItemId")
    @Mapping(source = "colorItem.id", target = "colorItemId")
    @Mapping(expression = "java(entity.getRamItem() != null ? entity.getRamItem().getValue() : null)", target = "ram")
    @Mapping(expression = "java(entity.getStorageItem() != null ? entity.getStorageItem().getValue() : null)", target = "storage")
    @Mapping(expression = "java(entity.getColorItem() != null ? entity.getColorItem().getValue() : null)", target = "color")
    PhoneVariantDTO toDto(PhoneVariant entity);
}
