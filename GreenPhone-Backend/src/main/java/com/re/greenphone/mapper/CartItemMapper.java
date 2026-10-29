package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.CartItemDTO;
import com.re.greenphone.entity.CartItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CartItemMapper extends GenericMapper<CartItem, CartItemDTO> {

    @Override
    @Mapping(source = "phoneVariant.id", target = "phoneVariantId")
    @Mapping(source = "phoneVariant.phone.name", target = "phoneName")
    @Mapping(source = "phoneVariant.phone.id", target = "phoneId")
    @Mapping(expression = "java(entity.getPhoneVariant().getRamItem() != null ? entity.getPhoneVariant().getRamItem().getValue() : null)", target = "ram")
    @Mapping(expression = "java(entity.getPhoneVariant().getStorageItem() != null ? entity.getPhoneVariant().getStorageItem().getValue() : null)", target = "storage")
    @Mapping(expression = "java(entity.getPhoneVariant().getColorItem() != null ? entity.getPhoneVariant().getColorItem().getValue() : null)", target = "color")
    @Mapping(source = "phoneVariant.price", target = "price")
    @Mapping(source = "phoneVariant.discountPrice", target = "discountPrice")
    @Mapping(expression = "java(entity.getPhoneVariant().getPhone().getImages().isEmpty() ? null : entity.getPhoneVariant().getPhone().getImages().get(0).getImageUrl())", target = "imageUrl")
    CartItemDTO toDto(CartItem entity);
}
