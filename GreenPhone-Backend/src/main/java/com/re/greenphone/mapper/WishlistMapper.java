package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.WishlistItemResponse;
import com.re.greenphone.entity.Wishlist;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WishlistMapper extends GenericMapper<Wishlist, WishlistItemResponse> {

    @Override
    @Mapping(source = "phone.id", target = "phoneId")
    @Mapping(source = "phone.name", target = "name")
    @Mapping(source = "phone.name", target = "phoneName")
    @Mapping(source = "phone.brand.id", target = "brandId")
    @Mapping(source = "phone.brand.name", target = "brandName")
    WishlistItemResponse toDto(Wishlist entity);

    @Override
    List<WishlistItemResponse> toDtoList(List<Wishlist> entities);
}
