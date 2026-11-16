package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.AiChatRequest;
import com.re.greenphone.dto.response.AiChatResponse;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.service.AiAssistantService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiAssistantControllerTest {

    @Mock
    private AiAssistantService aiAssistantService;

    @InjectMocks
    private AiAssistantController controller;

    @Test
    @DisplayName("Endpoint POST /api/ai/chat tra ve HTTP 200 va boc trong ApiResponse")
    void testChatEndpointSuccess() {
        PhoneDTO phone = PhoneDTO.builder()
                .id(1L)
                .name("Samsung Galaxy S24")
                .lowestPrice(21000000L)
                .mainImageUrl("https://pub-r2.dev/s24.png")
                .build();

        AiChatResponse serviceResult = AiChatResponse.builder()
                .reply("Dạ GreenPhone xin gợi ý dòng máy Samsung Galaxy S24.")
                .suggestedPhones(List.of(phone))
                .build();

        when(aiAssistantService.chat(any(AiChatRequest.class))).thenReturn(serviceResult);

        AiChatRequest request = AiChatRequest.builder()
                .message("Mình cần tìm điện thoại Samsung tầm 15 đến 25 triệu để chụp ảnh đẹp")
                .build();

        ResponseEntity<ApiResponse<AiChatResponse>> responseEntity = controller.chat(request);

        assertNotNull(responseEntity);
        assertEquals(200, responseEntity.getStatusCode().value());
        assertNotNull(responseEntity.getBody());
        assertEquals(200, responseEntity.getBody().getCode());

        AiChatResponse bodyData = responseEntity.getBody().getData();
        assertNotNull(bodyData);
        assertEquals("Dạ GreenPhone xin gợi ý dòng máy Samsung Galaxy S24.", bodyData.getReply());
        assertEquals(1, bodyData.getSuggestedPhones().size());
        assertEquals("Samsung Galaxy S24", bodyData.getSuggestedPhones().get(0).getName());

        verify(aiAssistantService, times(1)).chat(any(AiChatRequest.class));
    }
}
