package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.AiChatRequest;
import com.re.greenphone.dto.response.AiChatResponse;
import com.re.greenphone.service.AiAssistantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Shopping Assistant", description = "Dịch vụ trợ lý AI tư vấn sản phẩm thông minh GreenPhone")
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    @PostMapping("/chat")
    @Operation(summary = "Gửi tin nhắn tư vấn mua sắm tới trợ lý AI",
               description = "Tiếp nhận câu hỏi của khách hàng, đối chiếu thông số 50 dòng máy và sinh câu trả lời tư vấn kèm sản phẩm gợi ý")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiAssistantService.chat(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
