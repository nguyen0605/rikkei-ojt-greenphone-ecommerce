package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneImageDTO {

    private Long id;
    private Long phoneId;
    private String imageUrl;
    private Boolean isMain;
    private Integer sortOrder;
}
