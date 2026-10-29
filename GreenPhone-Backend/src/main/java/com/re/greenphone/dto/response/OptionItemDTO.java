package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionItemDTO {

    private Long id;
    private Long optionId;
    private String optionType;
    private String value;
    private String hexColor;
    private Integer sortOrder;
}
