package com.re.greenphone.dto.response;

import lombok.*;

/**
 * OrderResponse DTO returning full order details including corporate VAT invoice info.
 * Extends OrderDTO for seamless compatibility across client and admin endpoints.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
public class OrderResponse extends OrderDTO {

    public static OrderResponse fromOrderDto(OrderDTO dto) {
        if (dto == null) return null;
        OrderResponse response = new OrderResponse();
        response.setId(dto.getId());
        response.setUserId(dto.getUserId());
        response.setUserName(dto.getUserName());
        response.setReceiverName(dto.getReceiverName());
        response.setReceiverPhone(dto.getReceiverPhone());
        response.setShippingAddress(dto.getShippingAddress());
        response.setTotalAmount(dto.getTotalAmount());
        response.setDiscountAmount(dto.getDiscountAmount());
        response.setShippingFee(dto.getShippingFee());
        response.setFinalAmount(dto.getFinalAmount());
        response.setOrderStatus(dto.getOrderStatus());
        response.setPaymentStatus(dto.getPaymentStatus());
        response.setPaymentMethod(dto.getPaymentMethod());
        response.setNote(dto.getNote());
        response.setHasInvoice(dto.getHasInvoice());
        response.setCompanyName(dto.getCompanyName());
        response.setTaxCode(dto.getTaxCode());
        response.setCompanyAddress(dto.getCompanyAddress());
        response.setInvoiceEmail(dto.getInvoiceEmail());
        response.setPromotionCode(dto.getPromotionCode());
        response.setCreatedAt(dto.getCreatedAt());
        response.setUpdatedAt(dto.getUpdatedAt());
        response.setOrderDetails(dto.getOrderDetails());
        return response;
    }
}
