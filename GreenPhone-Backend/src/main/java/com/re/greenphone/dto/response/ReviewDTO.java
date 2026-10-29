package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDTO {

    private Long id;
    private Long userId;
    private String userName;
    private Long phoneId;
    private Integer rating;
    private String content;
    private String status;
    private LocalDateTime createdAt;
}
