package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStaffStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;
}
