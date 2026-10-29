package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String role;
    private String status;
}
