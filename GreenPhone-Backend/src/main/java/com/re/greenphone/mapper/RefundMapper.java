package com.re.greenphone.mapper;

import com.re.greenphone.dto.response.RefundDTO;
import com.re.greenphone.entity.RefundTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RefundMapper {

    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "paymentId", source = "payment.id")
    @Mapping(target = "orderStatus", source = "order.orderStatus")
    @Mapping(target = "paymentStatus", source = "order.paymentStatus")
    RefundDTO toDto(RefundTransaction entity);
}

