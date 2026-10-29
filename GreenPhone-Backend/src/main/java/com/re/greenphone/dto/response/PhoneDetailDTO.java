package com.re.greenphone.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneDetailDTO {

    private Long id;
    private Long brandId;
    private String brandName;
    private String name;
    private String description;
    private String screen;
    private String os;
    private String chip;
    private String rearCamera;
    private String frontCamera;
    private String battery;
    private String warranty;
    private String status;
    private List<PhoneImageDTO> images;
    private List<PhoneVariantDTO> variants;
    private Double avgRating;
    private Long reviewCount;
}
