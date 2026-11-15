package com.re.greenphone.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhoneComparisonResponse {

    private List<ComparedPhoneDTO> phones;
    private List<SpecGroupDTO> specGroups;
    private List<String> differencesKeys;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComparedPhoneDTO {
        private Long id;
        private String name;
        private Long brandId;
        private String brandName;
        private String mainImageUrl;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private BigDecimal minDiscountPrice;
        private String screen;
        private String os;
        private String chip;
        private String rearCamera;
        private String frontCamera;
        private String battery;
        private String warranty;
        private List<String> ramOptions;
        private List<String> storageOptions;
        private List<String> colorOptions;
        private Double avgRating;
        private Long reviewCount;
        private Integer totalStock;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpecGroupDTO {
        private String groupKey;
        private String groupName;
        private List<SpecItemDTO> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpecItemDTO {
        private String key;
        private String label;
        private Map<Long, String> values; // Map phoneId -> giá trị hiển thị
        @JsonProperty("isDifferent")
        private boolean isDifferent;
    }
}
