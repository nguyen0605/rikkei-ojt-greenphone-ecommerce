package com.re.greenphone.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
public class AdminOrderDetailDTO extends OrderDTO {

    private List<OrderHistoryDTO> histories = new ArrayList<>();
    private List<ShipmentDTO> shipments = new ArrayList<>();
    private List<PaymentDTO> payments = new ArrayList<>();

    public static AdminOrderDetailDTO fromOrderDto(OrderDTO dto,
                                                   List<OrderHistoryDTO> histories,
                                                   List<ShipmentDTO> shipments,
                                                   List<PaymentDTO> payments) {
        if (dto == null) return null;
        AdminOrderDetailDTO adminDto = new AdminOrderDetailDTO();
        adminDto.setId(dto.getId());
        adminDto.setUserId(dto.getUserId());
        adminDto.setUserName(dto.getUserName());
        adminDto.setReceiverName(dto.getReceiverName());
        adminDto.setReceiverPhone(dto.getReceiverPhone());
        adminDto.setShippingAddress(dto.getShippingAddress());
        adminDto.setTotalAmount(dto.getTotalAmount());
        adminDto.setDiscountAmount(dto.getDiscountAmount());
        adminDto.setShippingFee(dto.getShippingFee());
        adminDto.setFinalAmount(dto.getFinalAmount());
        adminDto.setOrderStatus(dto.getOrderStatus());
        adminDto.setPaymentStatus(dto.getPaymentStatus());
        adminDto.setPaymentMethod(dto.getPaymentMethod());
        adminDto.setNote(dto.getNote());
        adminDto.setPromotionCode(dto.getPromotionCode());
        adminDto.setCreatedAt(dto.getCreatedAt());
        adminDto.setOrderDetails(dto.getOrderDetails());
        adminDto.setHistories(histories != null ? histories : new ArrayList<>());
        adminDto.setShipments(shipments != null ? shipments : new ArrayList<>());
        adminDto.setPayments(payments != null ? payments : new ArrayList<>());
        return adminDto;
    }
}

