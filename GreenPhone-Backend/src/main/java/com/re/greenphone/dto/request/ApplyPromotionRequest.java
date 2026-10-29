package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyPromotionRequest {

    @NotBlank(message = "Promotion code is required")
    private String code;
}
