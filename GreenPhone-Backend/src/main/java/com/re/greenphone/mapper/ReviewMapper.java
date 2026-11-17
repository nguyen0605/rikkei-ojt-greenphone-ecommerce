package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.ReviewDTO;
import com.re.greenphone.entity.Review;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Collections;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ReviewMapper extends GenericMapper<Review, ReviewDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    @Mapping(source = "phone.id", target = "phoneId")
    @Mapping(source = "phone.name", target = "phoneName")
    @Mapping(source = "orderDetail.id", target = "orderDetailId")
    @Mapping(target = "phoneImage", expression = "java(getPhoneImage(entity.getPhone()))")
    @Mapping(target = "images", expression = "java(mapImages(entity))")
    ReviewDTO toDto(Review entity);

    @Override
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "phone", ignore = true)
    @Mapping(target = "orderDetail", ignore = true)
    Review toEntity(ReviewDTO dto);

    default List<String> mapImages(Review entity) {
        if (entity == null || entity.getImages() == null || entity.getImages().isEmpty()) {
            return Collections.emptyList();
        }
        return entity.getImages().stream()
                .map(com.re.greenphone.entity.ReviewImage::getImageUrl)
                .filter(url -> url != null && !url.trim().isEmpty())
                .toList();
    }

    default String getPhoneImage(com.re.greenphone.entity.Phone phone) {
        if (phone == null || phone.getImages() == null || phone.getImages().isEmpty()) {
            return null;
        }
        return phone.getImages().stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                .map(com.re.greenphone.entity.PhoneImage::getImageUrl)
                .findFirst()
                .orElse(phone.getImages().get(0).getImageUrl());
    }
}
