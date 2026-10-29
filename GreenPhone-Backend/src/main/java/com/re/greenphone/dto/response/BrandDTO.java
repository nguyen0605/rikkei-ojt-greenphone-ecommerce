package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandDTO {

    private Long id;
    private String name;
    private String logoUrl;
    private String status;
}
