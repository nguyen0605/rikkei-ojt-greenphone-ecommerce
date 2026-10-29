package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerDTO {

    private Long id;
    private String title;
    private String imageUrl;
    private String linkUrl;
    private String status;
}
