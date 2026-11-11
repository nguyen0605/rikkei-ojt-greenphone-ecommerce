package com.re.greenphone.dto.request;

import com.re.greenphone.enums.ClaimStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateClaimStatusRequest {

    @NotNull(message = "Trạng thái mới không được để trống")
    @Schema(description = "Trạng thái mới cần chuyển đổi", example = "IN_INSPECTION")
    private ClaimStatus status;

    @Schema(description = "Phương án xử lý kỹ thuật", example = "Thay thế linh kiện màn hình chính hãng")
    private String resolution;

    @Schema(description = "Ghi chú tiến trình sửa chữa", example = "Đã nhận máy từ kho và chuyển KTV phần cứng")
    private String note;

    @Schema(description = "Tên kỹ thuật viên thực hiện", example = "KTV Trần Văn B")
    private String performedByName;
}
