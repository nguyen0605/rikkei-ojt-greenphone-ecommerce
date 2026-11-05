package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.ReviewDTO;
import com.re.greenphone.entity.Review;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReviewMapper extends GenericMapper<Review, ReviewDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    @Mapping(source = "phone.id", target = "phoneId")
    @Mapping(source = "orderDetail.id", target = "orderDetailId")
    ReviewDTO toDto(Review entity);
}
