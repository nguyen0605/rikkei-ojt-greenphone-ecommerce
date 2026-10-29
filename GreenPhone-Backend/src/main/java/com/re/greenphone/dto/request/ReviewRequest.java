package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewRequest {

    @NotNull(message = "Order detail ID is required")
    private Long orderDetailId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be 1-5")
    @Max(value = 5, message = "Rating must be 1-5")
    private Integer rating;

    private String content;
}
