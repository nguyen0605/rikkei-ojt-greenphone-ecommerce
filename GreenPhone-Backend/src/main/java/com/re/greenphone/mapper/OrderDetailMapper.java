package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.OrderDetailDTO;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderDetailMapper extends GenericMapper<OrderDetail, OrderDetailDTO> {

    @Override
    @Mapping(source = "phoneVariant.id", target = "phoneVariantId")
    @Mapping(source = "phoneVariant.phone.id", target = "phoneId")
    @Mapping(source = "phoneVariant.phone.status", target = "productStatus")
    @Mapping(target = "imageUrl", expression = "java(resolveImageUrl(entity))")
    // Order history is immutable — read the snapshot columns, not the live variant
    @Mapping(source = "productName", target = "productName")
    @Mapping(source = "ram", target = "ram")
    @Mapping(source = "storage", target = "storage")
    @Mapping(source = "color", target = "color")
    @Mapping(target = "reviewed", constant = "false")
    OrderDetailDTO toDto(OrderDetail entity);

    default String resolveImageUrl(OrderDetail entity) {
        if (entity == null || entity.getPhoneVariant() == null || entity.getPhoneVariant().getPhone() == null) {
            return null;
        }
        Phone phone = entity.getPhoneVariant().getPhone();
        if (phone.getImages() == null || phone.getImages().isEmpty()) {
            return null;
        }
        return phone.getImages().stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                .findFirst()
                .orElse(phone.getImages().get(0))
                .getImageUrl();
    }
}
