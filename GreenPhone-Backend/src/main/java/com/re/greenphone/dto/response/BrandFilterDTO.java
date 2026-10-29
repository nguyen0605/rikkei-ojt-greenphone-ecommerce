package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Lightweight projection for brand filter dropdowns.
 * Avoids loading full Phone entities just to get distinct brands.
 */
@Getter
@AllArgsConstructor
public class BrandFilterDTO {
    private Long id;
    private String name;
}
