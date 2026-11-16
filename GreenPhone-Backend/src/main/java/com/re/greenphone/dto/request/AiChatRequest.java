package com.re.greenphone.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatRequest {

    @NotBlank(message = "Tin nhắn câu hỏi không được để trống")
    private String message;

    private List<HistoryItem> history;

    private String imageBase64;
    private String imageMimeType;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HistoryItem {
        private String role; // "user" hoac "model"
        private String text;
    }
}
