package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnReviewRequest {

    @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
    private String adminNote;

    // Tuỳ chọn IMEI cho máy mới khi duyệt EXCHANGE (nếu để trống hệ thống có thể tự sinh IMEI bảo hành)
    private String newImeiNumber;
}

