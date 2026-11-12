package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiveTransferRequest {
    @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
    private String note;

    /**
     * Tùy chọn số lượng nhập cho từng transfer_item_id. Nếu null hoặc rỗng, mặc định nhập toàn bộ số lượng đang in-transit.
     */
    private Map<Long, Integer> itemQuantities;
}

