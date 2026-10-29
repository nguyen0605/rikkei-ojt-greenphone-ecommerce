package com.re.greenphone.dto.response;

import lombok.*;

import java.util.List;

/** Category + its items — the public filter-tree shape consumed by /san-pham. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionTreeDTO {

    private Long id;
    private String type;
    private String label;
    private Boolean enabled;
    private Integer maxItems;
    private Integer sortOrder;
    private List<OptionItemDTO> items;
}
