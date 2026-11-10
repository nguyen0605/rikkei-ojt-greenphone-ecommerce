package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishlistAddRequest {

    @NotNull(message = "Phone ID is required")
    private Long phoneId;
}
