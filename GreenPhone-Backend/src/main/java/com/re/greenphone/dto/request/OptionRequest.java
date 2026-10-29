package com.re.greenphone.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionRequest {

    @NotBlank(message = "Type is required")
    @Size(max = 30)
    private String type;

    @NotBlank(message = "Label is required")
    @Size(max = 100)
    private String label;

    private Boolean enabled;

    @Min(1)
    @Max(100)
    private Integer maxItems;

    private Integer sortOrder;
}
