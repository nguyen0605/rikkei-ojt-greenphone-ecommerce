package com.re.greenphone.dto.request;

import com.re.greenphone.enums.ReturnType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnCreateRequest {

    @NotNull(message = "Mã ID đơn hàng không được để trống")
    private Long orderId;

    @NotNull(message = "Mã ID biến thể điện thoại không được để trống")
    private Long phoneVariantId;

    @NotBlank(message = "Lý do đổi trả không được để trống")
    @Size(max = 255, message = "Lý do không được vượt quá 255 ký tự")
    private String reason;

    @NotBlank(message = "Mô tả chi tiết lỗi không được để trống")
    private String errorDescription;

    private ReturnType type; // EXCHANGE hoặc REFUND (mặc định EXCHANGE)

    private List<String> proofImages; // Danh sách link ảnh từ R2
}

