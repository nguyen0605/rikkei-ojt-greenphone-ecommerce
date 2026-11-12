package com.re.greenphone.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishlistItemResponse {

    private Long id;
    private Long phoneId;
    private String name;
    private String phoneName;
    private Long brandId;
    private String brandName;
    private String imageUrl;
    private String thumbnail;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Boolean inStock;
    private LocalDateTime createdAt;
}
