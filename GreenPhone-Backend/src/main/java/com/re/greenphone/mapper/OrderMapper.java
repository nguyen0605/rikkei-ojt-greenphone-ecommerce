package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.AdminOrderDetailDTO;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {OrderDetailMapper.class})
public interface OrderMapper extends GenericMapper<Order, OrderDTO> {

    @Override
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.fullName", target = "userName")
    @Mapping(source = "userPromotion.promotion.code", target = "promotionCode")
    // Use the stored capped discount, not the raw promotion value
    @Mapping(source = "discountAmount", target = "discountAmount")
    @Mapping(source = "orderDetails", target = "orderDetails")
    OrderDTO toDto(Order entity);

    default AdminOrderDetailDTO toAdminDetailDto(Order entity) {
        OrderDTO dto = toDto(entity);
        return AdminOrderDetailDTO.fromOrderDto(dto, null, null, null);
    }
}
