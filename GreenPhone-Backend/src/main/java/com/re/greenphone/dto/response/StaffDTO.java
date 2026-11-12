package com.re.greenphone.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffDTO {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
