package com.re.greenphone.dto.request;

import com.re.greenphone.enums.HardwareIssueType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyClaimCreateRequest {

    @NotBlank(message = "Số IMEI không được để trống")
    @Pattern(regexp = "^[0-9]{15}$", message = "Số IMEI phải đúng định dạng 15 chữ số")
    @Schema(description = "Số IMEI 15 chữ số của thiết bị", example = "860123456789012")
    private String imeiNumber;

    @NotNull(message = "Loại lỗi phần cứng không được để trống")
    @Schema(description = "Phân loại lỗi phần cứng", example = "SCREEN")
    private HardwareIssueType hardwareIssueType;

    @NotBlank(message = "Mô tả lỗi không được để trống")
    @Schema(description = "Mô tả chi tiết hiện tượng lỗi thực tế", example = "Màn hình bị sọc xanh")
    private String issueDescription;

    @Schema(description = "Chi phí sửa chữa (nếu thiết bị đã hết hạn bảo hành)", example = "0")
    private BigDecimal repairCost;

    @Schema(description = "Ghi chú bổ sung từ khách hàng hoặc kỹ thuật viên", example = "Máy rơi nhẹ góc dưới")
    private String customerNote;

    @Schema(description = "Tên kỹ thuật viên hoặc nhân viên tiếp nhận", example = "KTV Nguyễn Văn A")
    private String receivedByName;
}
