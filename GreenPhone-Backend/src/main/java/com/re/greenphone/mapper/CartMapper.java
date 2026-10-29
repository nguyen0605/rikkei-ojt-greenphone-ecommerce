package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.CartDTO;
import com.re.greenphone.entity.Cart;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {CartItemMapper.class})
public interface CartMapper extends GenericMapper<Cart, CartDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "cartItems", target = "items")
    CartDTO toDto(Cart entity);
}
