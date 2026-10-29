package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {

    private Long id;
    private Long userId;
    private String userName;
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
    private BigDecimal totalAmount;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private String orderStatus;
    private String paymentStatus;
    private String paymentMethod;
    private String note;
    private String promotionCode;
    private LocalDateTime createdAt;
    private List<OrderDetailDTO> orderDetails;
}
