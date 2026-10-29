package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.UserPromotionDTO;
import com.re.greenphone.entity.UserPromotion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserPromotionMapper extends GenericMapper<UserPromotion, UserPromotionDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "promotion.id", target = "promotionId")
    @Mapping(source = "promotion.code", target = "code")
    @Mapping(source = "promotion.name", target = "name")
    @Mapping(source = "promotion.discountType", target = "discountType")
    @Mapping(source = "promotion.discountValue", target = "discountValue")
    @Mapping(source = "promotion.minOrderValue", target = "minOrderAmount")
    @Mapping(source = "promotion.maxDiscountAmount", target = "maxDiscountAmount")
    @Mapping(source = "promotion.startDate", target = "startDate")
    @Mapping(source = "promotion.endDate", target = "endDate")
    UserPromotionDTO toDto(UserPromotion entity);
}
