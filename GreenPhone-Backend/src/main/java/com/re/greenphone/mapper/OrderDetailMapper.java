package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.OrderDetailDTO;
import com.re.greenphone.entity.OrderDetail;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderDetailMapper extends GenericMapper<OrderDetail, OrderDetailDTO> {

    @Override
    @Mapping(source = "phoneVariant.id", target = "phoneVariantId")
    // Order history is immutable — read the snapshot columns, not the live variant
    @Mapping(source = "productName", target = "productName")
    @Mapping(source = "ram", target = "ram")
    @Mapping(source = "storage", target = "storage")
    @Mapping(source = "color", target = "color")
    @Mapping(target = "reviewed", constant = "false")
    OrderDetailDTO toDto(OrderDetail entity);
}
