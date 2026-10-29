package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionDTO {

    private Long id;
    private String type;
    private String label;
    private Boolean enabled;
    private Integer maxItems;
    private Integer sortOrder;
}
