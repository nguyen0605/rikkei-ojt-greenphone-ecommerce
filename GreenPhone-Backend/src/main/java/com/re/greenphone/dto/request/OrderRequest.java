package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {

    @NotBlank(message = "Receiver name is required")
    private String receiverName;

    @NotBlank(message = "Receiver phone is required")
    private String receiverPhone;

    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    private String note;

    private Boolean requestInvoice;

    private Boolean includePaperInvoice;

    @Size(max = 255, message = "Tên công ty tối đa 255 ký tự")
    private String companyName;

    @Pattern(regexp = "^$|^(\\d{10}|\\d{13}|\\d{10}-\\d{3})$", message = "Mã số thuế không hợp lệ (phải gồm 10 hoặc 13 chữ số)")
    private String taxCode;

    @Size(max = 500, message = "Địa chỉ công ty tối đa 500 ký tự")
    private String companyAddress;

    @Email(message = "Email nhận hóa đơn không đúng định dạng")
    private String invoiceEmail;

    private Long userPromotionId;

    private Boolean buyNow;

    private Double latitude;

    private Double longitude;

    @NotNull(message = "Order items are required")
    @Size(min = 1, message = "At least one item required")
    private List<OrderItemRequest> items;
}
