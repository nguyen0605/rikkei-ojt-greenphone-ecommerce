package com.re.greenphone.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private Long userId;
    private String token;
    private String refreshToken;
    private String fullName;
    private String email;
    private String role;
    private long expiresIn;

    public AuthResponse(Long userId, String token, String fullName, String email, String role, long expiresIn) {
        this.userId = userId;
        this.token = token;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.expiresIn = expiresIn;
    }
}
