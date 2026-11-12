package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStaffRoleRequest {

    @NotBlank(message = "Vai trò không được để trống")
    private String role;
}
