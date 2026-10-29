package com.re.greenphone.mapper;

import com.re.greenphone.dto.request.RegisterRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "cart", ignore = true)
    @Mapping(target = "orders", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "userPromotions", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "password", source = "password")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(RegisterRequest request);

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.email", target = "email")
    @Mapping(source = "user.fullName", target = "fullName")
    @Mapping(source = "user.role.name", target = "role")
    @Mapping(source = "token", target = "token")
    @Mapping(source = "expiresIn", target = "expiresIn")
    AuthResponse toAuthResponse(User user, String token, long expiresIn);
}
