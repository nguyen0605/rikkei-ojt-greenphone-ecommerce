package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.CartDTO;
import com.re.greenphone.dto.response.CartItemDTO;
import com.re.greenphone.entity.Cart;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.math.BigDecimal;

@Mapper(componentModel = "spring", uses = {CartItemMapper.class})
public interface CartMapper extends GenericMapper<Cart, CartDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "cartItems", target = "items")
    CartDTO toDto(Cart entity);

    @AfterMapping
    default void calculateTotals(@MappingTarget CartDTO dto) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            dto.setTotalAmount(BigDecimal.ZERO);
            dto.setTotalItems(0);
            return;
        }
        int totalItems = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartItemDTO item : dto.getItems()) {
            int q = item.getQuantity() != null ? item.getQuantity() : 0;
            totalItems += q;
            BigDecimal unitPrice = item.getDiscountPrice() != null ? item.getDiscountPrice() : item.getPrice();
            if (unitPrice != null) {
                BigDecimal sub = unitPrice.multiply(BigDecimal.valueOf(q));
                item.setSubtotal(sub);
                totalAmount = totalAmount.add(sub);
            }
        }
        dto.setTotalItems(totalItems);
        dto.setTotalAmount(totalAmount);
    }
}
