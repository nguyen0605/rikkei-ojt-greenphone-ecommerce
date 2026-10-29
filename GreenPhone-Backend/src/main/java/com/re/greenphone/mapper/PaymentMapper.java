package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.PaymentDTO;
import com.re.greenphone.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentMapper extends GenericMapper<Payment, PaymentDTO> {

    @Override
    @Mapping(source = "order.id", target = "orderId")
    PaymentDTO toDto(Payment entity);
}
