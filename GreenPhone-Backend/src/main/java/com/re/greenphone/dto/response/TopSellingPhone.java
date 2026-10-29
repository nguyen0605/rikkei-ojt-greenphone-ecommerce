package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopSellingPhone {

    private Long phoneId;
    private String phoneName;
    private String brandName;
    private Long soldQuantity;
    private String mainImageUrl;
}
