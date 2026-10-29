package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneRequest {

    @NotNull(message = "Brand ID is required")
    private Long brandId;

    @NotBlank(message = "Phone name is required")
    @Size(max = 150, message = "Phone name must not exceed 150 characters")
    private String name;

    private String description;
    private String screen;
    private String os;
    private String chip;
    private String rearCamera;
    private String frontCamera;
    private String battery;
    private String warranty;
}
