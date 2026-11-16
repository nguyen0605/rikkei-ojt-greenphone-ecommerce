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
    @Mapping(target = "images", expression = "java(parseImages(entity.getImagesJson()))")
    ReviewDTO toDto(Review entity);

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

    default List<String> parseImages(String imagesJson) {
        if (imagesJson == null || imagesJson.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(
                    imagesJson,
                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}
            );
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
