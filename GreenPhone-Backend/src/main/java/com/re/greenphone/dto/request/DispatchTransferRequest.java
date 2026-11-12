package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DispatchTransferRequest {
    @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
    private String note;

    /**
     * Tùy chọn số lượng xuất cho từng transfer_item_id. Nếu null hoặc rỗng, mặc định xuất toàn bộ requestedQuantity.
     */
    private Map<Long, Integer> itemQuantities;
}

