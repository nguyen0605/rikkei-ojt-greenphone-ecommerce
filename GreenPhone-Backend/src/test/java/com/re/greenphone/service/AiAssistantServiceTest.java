package com.re.greenphone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.dto.request.AiChatRequest;
import com.re.greenphone.dto.response.AiChatResponse;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.repository.PhoneRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiAssistantServiceTest {

    @Mock
    private PhoneRepository phoneRepository;

    @Mock
    private PhoneMapper phoneMapper;

    @Mock
    private RestClient geminiRestClient;

    @InjectMocks
    private AiAssistantService aiAssistantService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Phone samsungS24;
    private Phone samsungA55;
    private Phone iphone15;
    private Phone xiaomiRedmi13;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiAssistantService, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(aiAssistantService, "geminiModel", "gemini-3.5-flash-lite");
        ReflectionTestUtils.setField(aiAssistantService, "geminiBaseUrl", "https://generativelanguage.googleapis.com/v1beta/models");
        ReflectionTestUtils.setField(aiAssistantService, "geminiApiKey", ""); // mac dinh de trong de test fallback

        Brand samsung = Brand.builder().name("Samsung").build();
        ReflectionTestUtils.setField(samsung, "id", 1L);

        Brand apple = Brand.builder().name("Apple").build();
        ReflectionTestUtils.setField(apple, "id", 2L);

        Brand xiaomi = Brand.builder().name("Xiaomi").build();
        ReflectionTestUtils.setField(xiaomi, "id", 3L);

        // Samsung Galaxy S24: 21.000.000d
        samsungS24 = Phone.builder()
                .name("Samsung Galaxy S24")
                .brand(samsung)
                .status("ACTIVE")
                .chip("Exynos 2400")
                .rearCamera("50MP + 12MP + 10MP (OIS)")
                .battery("4000mAh")
                .screen("Dynamic AMOLED 2X 6.2 inch 120Hz")
                .variants(new ArrayList<>(List.of(
                        PhoneVariant.builder().price(BigDecimal.valueOf(21000000)).stockQuantity(10).build()
                )))
                .images(new ArrayList<>(List.of(
                        PhoneImage.builder().imageUrl("https://pub-r2.dev/s24.png").isMain(true).build()
                )))
                .build();
        ReflectionTestUtils.setField(samsungS24, "id", 101L);

        // Samsung Galaxy A55: 9.690.000d
        samsungA55 = Phone.builder()
                .name("Samsung Galaxy A55 5G")
                .brand(samsung)
                .status("ACTIVE")
                .chip("Exynos 1480")
                .rearCamera("50MP + 12MP + 5MP (OIS)")
                .battery("5000mAh")
                .screen("Super AMOLED 6.6 inch 120Hz")
                .variants(new ArrayList<>(List.of(
                        PhoneVariant.builder().price(BigDecimal.valueOf(9690000)).stockQuantity(15).build()
                )))
                .images(new ArrayList<>(List.of(
                        PhoneImage.builder().imageUrl("https://pub-r2.dev/a55.png").isMain(true).build()
                )))
                .build();
        ReflectionTestUtils.setField(samsungA55, "id", 102L);

        // iPhone 15: 19.500.000d
        iphone15 = Phone.builder()
                .name("iPhone 15")
                .brand(apple)
                .status("ACTIVE")
                .chip("Apple A16 Bionic")
                .rearCamera("48MP + 12MP")
                .battery("3349mAh")
                .screen("OLED Super Retina XDR 6.1 inch")
                .variants(new ArrayList<>(List.of(
                        PhoneVariant.builder().price(BigDecimal.valueOf(19500000)).stockQuantity(8).build()
                )))
                .images(new ArrayList<>(List.of(
                        PhoneImage.builder().imageUrl("https://pub-r2.dev/ip15.png").isMain(true).build()
                )))
                .build();
        ReflectionTestUtils.setField(iphone15, "id", 103L);

        // Xiaomi Redmi 13: 4.290.000d
        xiaomiRedmi13 = Phone.builder()
                .name("Xiaomi Redmi 13")
                .brand(xiaomi)
                .status("ACTIVE")
                .chip("Helio G91 Ultra")
                .rearCamera("108MP + 2MP")
                .battery("5030mAh")
                .screen("IPS LCD 6.79 inch 90Hz")
                .variants(new ArrayList<>(List.of(
                        PhoneVariant.builder().price(BigDecimal.valueOf(4290000)).stockQuantity(20).build()
                )))
                .images(new ArrayList<>(List.of(
                        PhoneImage.builder().imageUrl("https://pub-r2.dev/redmi13.png").isMain(true).build()
                )))
                .build();
        ReflectionTestUtils.setField(xiaomiRedmi13, "id", 104L);

        lenient().when(phoneMapper.toDto(any(Phone.class))).thenAnswer(invocation -> {
            Phone p = invocation.getArgument(0);
            return PhoneDTO.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .brandName(p.getBrand() != null ? p.getBrand().getName() : null)
                    .chip(p.getChip())
                    .rearCamera(p.getRearCamera())
                    .battery(p.getBattery())
                    .screen(p.getScreen())
                    .build();
        });
    }

    @Test
    @DisplayName("Kiem tra trich xuat tieu chi nguoi dung tu cau hoi chat")
    void testExtractCriteria() {
        // Tieu chi 1: Duoi 10 trieu
        AiAssistantService.Criteria c1 = aiAssistantService.extractCriteria("Mình cần mua máy dưới 10 triệu pin trâu");
        assertThat(c1.maxPrice()).isEqualTo(10_000_000L);
        assertThat(c1.batteryFocus()).isTrue();

        // Tieu chi 2: Samsung tam 15 den 25 trieu de chup anh dep
        AiAssistantService.Criteria c2 = aiAssistantService.extractCriteria("Mình cần tìm điện thoại Samsung tầm 15 đến 25 triệu để chụp ảnh đẹp");
        assertThat(c2.brand()).isEqualTo("Samsung");
        assertThat(c2.minPrice()).isEqualTo(15_000_000L);
        assertThat(c2.maxPrice()).isEqualTo(25_000_000L);
        assertThat(c2.cameraFocus()).isTrue();

        // Tieu chi 3: iPhone tam 20tr
        AiAssistantService.Criteria c3 = aiAssistantService.extractCriteria("Tư vấn iPhone tầm 20tr");
        assertThat(c3.brand()).isEqualTo("Apple");
        assertThat(c3.minPrice()).isNotNull();
        assertThat(c3.maxPrice()).isNotNull();
    }

    @Test
    @DisplayName("Kiem tra tieu chuan nghiem thu: khi hoi may duoi 10 trieu chi tra ve san pham gia <= 10.000.000d")
    void testChatUnder10MillionFiltersCorrectly() {
        when(phoneRepository.findAll()).thenReturn(List.of(samsungS24, samsungA55, iphone15, xiaomiRedmi13));

        AiChatRequest request = AiChatRequest.builder()
                .message("Tư vấn cho mình điện thoại dưới 10 triệu")
                .build();

        AiChatResponse response = aiAssistantService.chat(request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).isNotBlank();
        assertThat(response.getSuggestedPhones()).isNotEmpty();

        // Tat ca cac may duoc de xuat phai co gia <= 10.000.000d
        for (PhoneDTO p : response.getSuggestedPhones()) {
            assertThat(p.getLowestPrice())
                    .as("San pham %s phai co gia <= 10.000.000d", p.getName())
                    .isLessThanOrEqualTo(10_000_000L);
        }

        // Danh sach phai chua A55 (9.69tr) hoac Redmi 13 (4.29tr), khong duoc chua S24 (21tr) hay iPhone 15 (19.5tr)
        List<String> names = response.getSuggestedPhones().stream().map(PhoneDTO::getName).toList();
        assertThat(names).doesNotContain("Samsung Galaxy S24", "iPhone 15");
    }

    @Test
    @DisplayName("Kiem tra co che Fallback an toan khi chua co API key hoac gap su co ket noi")
    void testFallbackWhenApiKeyMissingOrNetworkError() {
        when(phoneRepository.findAll()).thenReturn(List.of(samsungS24, samsungA55));

        AiChatRequest request = AiChatRequest.builder()
                .message("Mình cần tìm điện thoại Samsung tầm 15 đến 25 triệu để chụp ảnh đẹp")
                .build();

        AiChatResponse response = aiAssistantService.chat(request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Dạ GreenPhone xin chào bạn");
        assertThat(response.getReply()).contains("/san-pham");
        assertThat(response.getSuggestedPhones()).isNotEmpty();

        // San pham goi y phai la Samsung Galaxy S24 (21tr thuoc khoang 15-25tr)
        PhoneDTO topSuggestion = response.getSuggestedPhones().get(0);
        assertThat(topSuggestion.getName()).isEqualTo("Samsung Galaxy S24");
        assertThat(topSuggestion.getLowestPrice()).isEqualTo(21_000_000L);
    }

    @Test
    @DisplayName("Kiem tra phan hoi khi tin nhan de trong")
    void testBlankMessage() {
        AiChatRequest request = AiChatRequest.builder().message("   ").build();
        AiChatResponse response = aiAssistantService.chat(request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Dạ GreenPhone xin chào bạn");
        assertThat(response.getSuggestedPhones()).isEmpty();
    }

    @Test
    @DisplayName("Kiem tra goi thanh cong qua Gemini API va parse phan hoi")
    @SuppressWarnings("unchecked")
    void testChatWithGeminiApiSuccess() {
        ReflectionTestUtils.setField(aiAssistantService, "geminiApiKey", "test-valid-api-key");
        when(phoneRepository.findAll()).thenReturn(List.of(samsungS24, samsungA55));

        // Mock RestClient chain
        RestClient.RequestBodyUriSpec uriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec bodySpec = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(geminiRestClient.post()).thenReturn(uriSpec);
        when(uriSpec.uri(anyString())).thenReturn(bodySpec);
        when(bodySpec.contentType(any())).thenReturn(bodySpec);
        when(bodySpec.body(any(Object.class))).thenReturn(bodySpec);
        when(bodySpec.retrieve()).thenReturn(responseSpec);

        String mockGeminiJson = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      {
                        "text": "Dạ GreenPhone xin gợi ý cho bạn dòng máy Samsung Galaxy S24 với camera 50MP sắc nét và chip mạnh mẽ vượt trội."
                      }
                    ]
                  }
                }
              ]
            }
            """;
        when(responseSpec.body(String.class)).thenReturn(mockGeminiJson);

        AiChatRequest request = AiChatRequest.builder()
                .message("Tư vấn máy Samsung cao cấp")
                .build();

        AiChatResponse response = aiAssistantService.chat(request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Samsung Galaxy S24");
        assertThat(response.getSuggestedPhones()).isNotEmpty();
        assertThat(response.getSuggestedPhones().get(0).getName()).isEqualTo("Samsung Galaxy S24");
    }
}
