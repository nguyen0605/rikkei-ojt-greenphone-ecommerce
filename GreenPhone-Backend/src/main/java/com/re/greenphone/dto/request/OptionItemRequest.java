package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionItemRequest {

    /** Optional — set by the controller from the path {optionId}. */
    private Long optionId;

    @NotBlank(message = "Value is required")
    @Size(max = 50)
    private String value;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Hex color must be like #1F1F1F")
    private String hexColor;

    private Integer sortOrder;
}
