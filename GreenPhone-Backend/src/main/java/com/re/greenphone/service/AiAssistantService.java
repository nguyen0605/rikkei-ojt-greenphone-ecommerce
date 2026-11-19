package com.re.greenphone.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.dto.request.AiChatRequest;
import com.re.greenphone.dto.response.AiChatResponse;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.repository.PhoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AiAssistantService {

    private final PhoneRepository phoneRepository;
    private final PhoneMapper phoneMapper;
    private final RestClient geminiRestClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String geminiModel;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiBaseUrl;

    private static final DecimalFormat PRICE_FORMAT = new DecimalFormat("#,###");

    /**
     * Xu ly chat tu van mua sam voi Gemini AI ket hop Grounding du lieu danh muc GreenPhone.
     */
    public AiChatResponse chat(AiChatRequest request) {
        String userMessage = request != null && request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isBlank()) {
            return AiChatResponse.builder()
                    .reply("Dạ GreenPhone xin chào bạn! Bạn đang cần tìm điện thoại theo tầm giá, thương hiệu hay tính năng nào, hãy nhắn cho mình nhé.")
                    .suggestedPhones(Collections.emptyList())
                    .build();
        }

        // 1. Trich xuat tieu chi nguoi dung (Ngan sach, Thuong hieu, Tinh nang)
        Criteria criteria = extractCriteria(userMessage);

        // 2. Nap du lieu thuc te tu co so du lieu GreenPhone (Grounding)
        List<Phone> activePhones = phoneRepository.findAll().stream()
                .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .toList();

        // 3. Loc va xep hang danh sach dien thoai phu hop (Candidates)
        List<PhoneCandidate> candidates = rankCandidates(activePhones, criteria);

        // 4. Neu khong co Gemini API Key hoac gap loi he thong, su dung Fallback an toan
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.contains("your_gemini_api_key")) {
            log.info("Gemini API Key chua duoc cau hinh hoac la placeholder. Su dung Rule-based Fallback an toan.");
            return buildFallbackResponse(criteria, candidates);
        }

        try {
            // 5. Xay dung System Prompt kem Grounding Context
            String systemInstruction = buildSystemPrompt(candidates);

            // 6. Xay dung payload gui toi Google Gemini API
            Map<String, Object> requestBody = buildGeminiPayload(systemInstruction, request, userMessage);

            String url = String.format("%s/%s:generateContent?key=%s", geminiBaseUrl, geminiModel, geminiApiKey);

            String responseString = geminiRestClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // 7. Parse phan hoi tu Gemini
            String aiReply = parseGeminiReply(responseString);

            // 8. Chon loc danh sach san pham de xuat
            List<PhoneDTO> suggestedPhones = pickSuggestedPhones(aiReply, candidates, criteria);

            return AiChatResponse.builder()
                    .reply(aiReply)
                    .suggestedPhones(suggestedPhones)
                    .build();

        } catch (Exception e) {
            log.warn("Loi khi goi Gemini AI Engine (chuyen sang Fallback an toan): {}", e.getMessage());
            return buildFallbackResponse(criteria, candidates);
        }
    }

    /**
     * Trich xuat ngan sach, hang va nhu cau tu cau hoi nguoi dung.
     */
    public Criteria extractCriteria(String message) {
        String clean = removeAccents(message);
        Long minPrice = null;
        Long maxPrice = null;

        // Pattern 1: duoi X trieu / tr
        Pattern underPattern = Pattern.compile("duoi\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:trieu|tr|m)");
        Matcher underMatcher = underPattern.matcher(clean);
        if (underMatcher.find()) {
            double value = parseNumber(underMatcher.group(1));
            maxPrice = (long) (value * 1_000_000);
        }

        // Pattern 2: tu/tam X den/toi Y trieu / tr
        Pattern rangePattern = Pattern.compile("(?:tu|tam|khoang)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:den|-|toi)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:trieu|tr|m)");
        Matcher rangeMatcher = rangePattern.matcher(clean);
        if (rangeMatcher.find()) {
            double v1 = parseNumber(rangeMatcher.group(1));
            double v2 = parseNumber(rangeMatcher.group(2));
            minPrice = (long) (Math.min(v1, v2) * 1_000_000);
            maxPrice = (long) (Math.max(v1, v2) * 1_000_000);
        }

        // Pattern 3: tam / khoang X trieu / tr
        if (minPrice == null && maxPrice == null) {
            Pattern approxPattern = Pattern.compile("(?:tam|khoang|co)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:trieu|tr|m)");
            Matcher approxMatcher = approxPattern.matcher(clean);
            if (approxMatcher.find()) {
                double val = parseNumber(approxMatcher.group(1));
                minPrice = Math.max(0, (long) ((val - 2.5) * 1_000_000));
                maxPrice = (long) ((val + 2.5) * 1_000_000);
            }
        }

        // Pattern 4: tren X trieu / tr
        Pattern overPattern = Pattern.compile("tren\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:trieu|tr|m)");
        Matcher overMatcher = overPattern.matcher(clean);
        if (overMatcher.find()) {
            double val = parseNumber(overMatcher.group(1));
            minPrice = (long) (val * 1_000_000);
        }

        // Trich xuat thuong hieu
        String brand = null;
        if (clean.contains("samsung") || clean.contains("galaxy")) {
            brand = "Samsung";
        } else if (clean.contains("apple") || clean.contains("iphone")) {
            brand = "Apple";
        } else if (clean.contains("xiaomi") || clean.contains("redmi")) {
            brand = "Xiaomi";
        } else if (clean.contains("oppo")) {
            brand = "OPPO";
        } else if (clean.contains("vivo")) {
            brand = "Vivo";
        } else if (clean.contains("oneplus")) {
            brand = "OnePlus";
        } else if (clean.contains("sony") || clean.contains("xperia")) {
            brand = "Sony";
        } else if (clean.contains("realme")) {
            brand = "Realme";
        } else if (clean.contains("asus") || clean.contains("rog")) {
            brand = "ASUS";
        } else if (clean.contains("pixel") || clean.contains("google")) {
            brand = "Google Pixel";
        }

        // Trich xuat nhu cau
        boolean cameraFocus = clean.contains("chup") || clean.contains("camera") || clean.contains("anh") || clean.contains("quay phim");
        boolean batteryFocus = clean.contains("pin") || clean.contains("trau") || clean.contains("khung");
        boolean gamingFocus = clean.contains("game") || clean.contains("choi") || clean.contains("hieu nang") || clean.contains("muot") || clean.contains("chip");

        return new Criteria(minPrice, maxPrice, brand, cameraFocus, batteryFocus, gamingFocus);
    }

    public static String removeAccents(String input) {
        if (input == null) return "";
        String s = input.replace('đ', 'd').replace('Đ', 'D');
        String normalized = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    private double parseNumber(String str) {
        try {
            return Double.parseDouble(str.replace(',', '.'));
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Xep hang cac dien thoai ung vien theo tieu chi de dua vao Grounding.
     */
    private List<PhoneCandidate> rankCandidates(List<Phone> phones, Criteria criteria) {
        List<PhoneCandidate> list = new ArrayList<>();

        for (Phone phone : phones) {
            Long lowestPrice = getLowestPrice(phone);
            if (lowestPrice == null) continue;

            // Kiem tra bo loc ngan sach nghiem ngat neu co yeu cau
            if (criteria.maxPrice() != null && lowestPrice > criteria.maxPrice()) {
                continue;
            }
            if (criteria.minPrice() != null && lowestPrice < criteria.minPrice()) {
                continue;
            }

            int score = 0;

            // Diem thuong hieu
            if (criteria.brand() != null && phone.getBrand() != null) {
                if (phone.getBrand().getName().equalsIgnoreCase(criteria.brand())) {
                    score += 50;
                } else {
                    // Neu hoi dung hang khac thi bo qua
                    continue;
                }
            }

            // Diem camera
            if (criteria.cameraFocus()) {
                String cam = (phone.getRearCamera() != null ? phone.getRearCamera() : "") + " "
                        + (phone.getFrontCamera() != null ? phone.getFrontCamera() : "");
                if (cam.contains("200MP") || cam.contains("108MP") || cam.contains("50MP")) score += 20;
                if (cam.contains("OIS") || cam.contains("tele") || cam.contains("quang học")) score += 10;
            }

            // Diem pin
            if (criteria.batteryFocus()) {
                String bat = phone.getBattery() != null ? phone.getBattery() : "";
                if (bat.contains("6000") || bat.contains("5500") || bat.contains("5000")) score += 25;
            }

            // Diem hieu nang / gaming
            if (criteria.gamingFocus()) {
                String chip = phone.getChip() != null ? phone.getChip().toLowerCase() : "";
                if (chip.contains("gen 3") || chip.contains("gen 2") || chip.contains("bionic") || chip.contains("dimensity 9")) score += 25;
                if (chip.contains("snapdragon") || chip.contains("apple")) score += 15;
            }

            // Diem rating danh gia
            score += (int) (calculateAvgRating(phone) * 2);

            list.add(new PhoneCandidate(phone, lowestPrice, score));
        }

        // Neu loc qua chat dan den list rong, thu lay danh sach theo gia hoac theo hang khong can dieu kien phu
        if (list.isEmpty()) {
            for (Phone phone : phones) {
                Long lowestPrice = getLowestPrice(phone);
                if (lowestPrice == null) continue;
                if (criteria.maxPrice() != null && lowestPrice > criteria.maxPrice()) continue;
                if (criteria.minPrice() != null && lowestPrice < criteria.minPrice()) continue;
                list.add(new PhoneCandidate(phone, lowestPrice, 10));
            }
        }

        // Sap xep uu tien theo diem so giam dan, neu bang diem thi uu tien gia hop ly
        list.sort((a, b) -> {
            int cmp = Integer.compare(b.score(), a.score());
            if (cmp != 0) return cmp;
            return Long.compare(b.lowestPrice(), a.lowestPrice());
        });

        // Gioi han toi da 10 san pham nhat de tranh qua tai token
        return list.stream().limit(10).toList();
    }

    /**
     * Xay dung System Prompt kem danh muc thuc te tu GreenPhone (Grounding).
     */
    private String buildSystemPrompt(List<PhoneCandidate> candidates) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là Trợ lý AI tư vấn mua sắm trực tuyến thông minh của GreenPhone (hệ thống bán lẻ điện thoại uy tín hàng đầu).\n");
        sb.append("Phong cách: Thân thiện, chu đáo, trung thực, xưng hô 'Dạ GreenPhone xin chào bạn' hoặc 'GreenPhone tư vấn cho bạn'.\n");
        sb.append("QUY TẮC BẮT BUỘC:\n");
        sb.append("1. CHỈ tư vấn và giới thiệu các dòng điện thoại có trong danh mục sản phẩm của GreenPhone được liệt kê dưới đây.\n");
        sb.append("2. TUYỆT ĐỐI KHÔNG tự bịa đặt sản phẩm, thông số hoặc mức giá không có trong danh mục được cung cấp.\n");
        sb.append("3. Giá bán luôn ghi rõ đơn vị Việt Nam Đồng (ví dụ: 15.990.000đ).\n");
        sb.append("4. Từ chối lịch sự nếu khách hỏi chủ đề không liên quan đến mua bán, thông số điện thoại hoặc chính sách bảo hành của GreenPhone.\n");
        sb.append("5. Nêu rõ lý do cụ thể vì sao mẫu máy phù hợp với nhu cầu khách hỏi (ưu điểm về camera, pin, chip, màn hình).\n");
        sb.append("6. Đưa ra gợi ý từ 1 đến 3 mẫu máy nổi bật nhất trong danh mục phù hợp tiêu chí của khách.\n");
        sb.append("7. Nếu khách hàng gửi kèm hình ảnh, hãy quan sát kỹ chi tiết máy (cụm camera, mặt lưng, màn hình, màu sắc) để nhận diện chính xác dòng điện thoại và đối chiếu với danh mục GreenPhone để tư vấn.\n\n");

        sb.append("DANH MỤC ĐIỆN THOẠI GREENPHONE CÓ SẴN (DÙNG ĐỂ TƯ VẤN):\n");
        for (PhoneCandidate c : candidates) {
            Phone p = c.phone();
            String brandName = p.getBrand() != null ? p.getBrand().getName() : "Khác";
            sb.append(String.format("- ID: %d | Tên: %s | Hãng: %s | Giá từ: %s đ | Chip: %s | Camera: %s | Pin: %s | Màn hình: %s\n",
                    p.getId(),
                    p.getName(),
                    brandName,
                    PRICE_FORMAT.format(c.lowestPrice()),
                    p.getChip() != null ? p.getChip() : "Đang cập nhật",
                    p.getRearCamera() != null ? p.getRearCamera() : "Đang cập nhật",
                    p.getBattery() != null ? p.getBattery() : "Đang cập nhật",
                    p.getScreen() != null ? p.getScreen() : "Đang cập nhật"
            ));
        }

        return sb.toString();
    }

    /**
     * Xay dung cau truc Request Body cho Gemini REST API.
     */
    private Map<String, Object> buildGeminiPayload(String systemInstruction, AiChatRequest request, String userMessage) {
        Map<String, Object> payload = new HashMap<>();

        // System Instruction
        payload.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemInstruction))
        ));

        // Contents (History + Message hien tai)
        List<Map<String, Object>> contents = new ArrayList<>();
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            for (AiChatRequest.HistoryItem h : request.getHistory()) {
                if (h.getText() != null && !h.getText().isBlank()) {
                    String role = "model".equalsIgnoreCase(h.getRole()) ? "model" : "user";
                    contents.add(Map.of(
                            "role", role,
                            "parts", List.of(Map.of("text", h.getText()))
                    ));
                }
            }
        }

        // Message hien tai cua user kem hinh anh (neu co)
        List<Map<String, Object>> userParts = new ArrayList<>();
        userParts.add(Map.of("text", userMessage));

        if (request.getImageBase64() != null && !request.getImageBase64().isBlank()) {
            String cleanData = cleanBase64Data(request.getImageBase64());
            String mimeType = (request.getImageMimeType() != null && !request.getImageMimeType().isBlank())
                    ? request.getImageMimeType()
                    : "image/jpeg";

            userParts.add(Map.of(
                    "inlineData", Map.of(
                            "mimeType", mimeType,
                            "data", cleanData
                    )
            ));
        }

        contents.add(Map.of(
                "role", "user",
                "parts", userParts
        ));

        payload.put("contents", contents);

        // Generation config
        payload.put("generationConfig", Map.of(
                "temperature", 0.3,
                "maxOutputTokens", 1000
        ));

        return payload;
    }

    private String cleanBase64Data(String data) {
        if (data == null) return "";
        int commaIndex = data.indexOf(",");
        if (commaIndex != -1 && data.startsWith("data:")) {
            return data.substring(commaIndex + 1).trim();
        }
        return data.trim();
    }

    /**
     * Parse chuoi phan hoi JSON tu Gemini API.
     */
    private String parseGeminiReply(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
        } catch (Exception e) {
            log.error("Loi khi parse ket qua JSON tu Gemini API: {}", e.getMessage());
        }
        return "Dạ GreenPhone xin chào bạn! Dưới đây là các gợi ý sản phẩm phù hợp nhất với yêu cầu của bạn tại hệ thống GreenPhone:";
    }

    /**
     * Chon loc danh sach san pham PhoneDTO kem theo loi tu van.
     */
    private List<PhoneDTO> pickSuggestedPhones(String aiReply, List<PhoneCandidate> candidates, Criteria criteria) {
        List<PhoneDTO> result = new ArrayList<>();
        String lowerReply = aiReply.toLowerCase(Locale.ROOT);

        // Uu tien nhung may duoc Gemini nhac den trong noi dung tra loi
        for (PhoneCandidate c : candidates) {
            String phoneNameLower = c.phone().getName().toLowerCase(Locale.ROOT);
            if (lowerReply.contains(phoneNameLower)) {
                result.add(toPhoneDto(c.phone(), c.lowestPrice()));
            }
        }

        // Neu chua tim thay may nao duoc nhac ten truc tiep, lay top ung vien diem cao nhat
        if (result.isEmpty()) {
            for (PhoneCandidate c : candidates) {
                result.add(toPhoneDto(c.phone(), c.lowestPrice()));
                if (result.size() >= 3) break;
            }
        }

        // Kiem tra bo loc ngan sach nghiem ngat de dam bao tieu chuan nghiem thu
        if (criteria.maxPrice() != null) {
            result = result.stream()
                    .filter(p -> p.getLowestPrice() != null && p.getLowestPrice() <= criteria.maxPrice())
                    .collect(Collectors.toList());
        }

        // Gioi han toi da 4 san pham tren giao dien
        if (result.size() > 4) {
            result = result.subList(0, 4);
        }

        return result;
    }

    /**
     * Phan hoi Rule-based thong minh khi khong the ket noi toi Gemini AI.
     * Tu dong phan tich chuyen sau theo tung chu de: Gaming, Camera, Pin trau hoac Ngan sach.
     */
    public AiChatResponse buildFallbackResponse(Criteria criteria, List<PhoneCandidate> candidates) {
        StringBuilder sb = new StringBuilder();

        if (candidates.isEmpty()) {
            sb.append("Dạ GreenPhone xin chào bạn! Cảm ơn bạn đã liên hệ tư vấn.\n");
            sb.append("Hiện tại với tiêu chí bạn đang tìm kiếm, hệ thống tạm thời chưa có mẫu máy phù hợp ngay lập tức. ");
            sb.append("Bạn vui lòng truy cập trang danh mục /san-pham hoặc điều chỉnh tầm giá để tham khảo thêm hơn 50 dòng điện thoại chính hãng giá tốt tại GreenPhone nhé!");
            return AiChatResponse.builder()
                    .reply(sb.toString())
                    .suggestedPhones(Collections.emptyList())
                    .build();
        }

        // 1. Loi mo dau ca nhan hoa chuyen sau theo tung nhu cau cu the
        if (criteria.gamingFocus()) {
            sb.append("Dạ GreenPhone chào bạn! Nếu bạn đang tìm kiếm cỗ máy chiến game đỉnh cao nhất (leo rank Liên Quân, PUBG Mobile, Tốc Chiến, Genshin Impact ở mức 60-120 FPS mượt mà), yếu tố quyết định là chip xử lý đồ họa mạnh mẽ, màn hình tần số quét 120Hz và khả năng tản nhiệt buồng hơi ổn định.\n\n");
            sb.append("Dưới đây là các 'quái vật hiệu năng' chơi game tốt nhất hiện có tại GreenPhone dành cho bạn:\n\n");
        } else if (criteria.cameraFocus()) {
            sb.append("Dạ GreenPhone chào bạn! Đối với nhu cầu chụp ảnh đẹp, quay video sắc nét, bắt trọn từng khoảnh khắc và chân dung nghệ thuật, GreenPhone xin gợi ý các dòng 'camera phone' có cảm biến lớn từ 50MP đến 200MP, hỗ trợ chống rung quang học OIS và ống kính tiềm vọng đỉnh cao sau đây:\n\n");
        } else if (criteria.batteryFocus()) {
            sb.append("Dạ GreenPhone chào bạn! Với ưu tiên pin trâu bền bỉ để thoải mái sử dụng liên tục cả ngày dài không lo gián đoạn, GreenPhone gợi ý những mẫu điện thoại trang bị viên pin lớn từ 5000mAh đến 6000mAh kèm công nghệ sạc siêu nhanh hàng đầu hiện nay:\n\n");
        } else {
            sb.append("Dạ GreenPhone xin chào bạn! Dựa trên nhu cầu");
            if (criteria.brand() != null) {
                sb.append(" về thương hiệu ").append(criteria.brand());
            }
            if (criteria.maxPrice() != null) {
                sb.append(" trong tầm giá dưới ").append(PRICE_FORMAT.format(criteria.maxPrice())).append("đ");
            }
            sb.append(", GreenPhone xin tư vấn các mẫu điện thoại nổi bật, toàn diện nhất hiện nay:\n\n");
        }

        // 2. Liet ke tung dong may kem phan tich danh gia chuyen sau
        List<PhoneDTO> suggested = new ArrayList<>();
        int count = 0;
        for (PhoneCandidate c : candidates) {
            Phone p = c.phone();
            count++;
            sb.append(String.format("%d. %s (Giá tham khảo: %s đ)\n",
                    count, p.getName(), PRICE_FORMAT.format(c.lowestPrice())));

            // Phan tich chuyen sau theo dac tinh may
            if (criteria.gamingFocus()) {
                String chip = p.getChip() != null ? p.getChip() : "Chip cao cấp";
                String battery = p.getBattery() != null ? p.getBattery() : "Pin lớn";
                sb.append(String.format("   - Đánh giá Gaming: Sức mạnh từ %s mang lại FPS ổn định tuyệt đối; kết hợp %s giúp bạn chiến game nhiều giờ liền không lo tụt pin.\n",
                        chip, battery));
            } else if (criteria.cameraFocus()) {
                String cam = p.getRearCamera() != null ? p.getRearCamera() : "Độ phân giải cao";
                sb.append(String.format("   - Đánh giá Camera: Cụm camera %s bắt nét siêu nhanh, khử nhiễu xuất sắc và chụp đêm cực kỳ ấn tượng.\n", cam));
            } else if (criteria.batteryFocus()) {
                String bat = p.getBattery() != null ? p.getBattery() : "Pin dung lượng lớn";
                sb.append(String.format("   - Đánh giá Thời lượng: Trang bị %s, tối ưu điện năng vượt trội cho thời gian On-screen cả ngày dài.\n", bat));
            } else {
                if (p.getChip() != null || p.getRearCamera() != null || p.getBattery() != null) {
                    sb.append(String.format("   - Thông số: Chip %s | Camera %s | Pin %s\n",
                            p.getChip() != null ? p.getChip() : "Đang cập nhật",
                            p.getRearCamera() != null ? p.getRearCamera() : "Đang cập nhật",
                            p.getBattery() != null ? p.getBattery() : "Đang cập nhật"));
                }
            }

            suggested.add(toPhoneDto(p, c.lowestPrice()));
            if (count >= 3) break;
        }

        sb.append("\nBạn có thể nhấn trực tiếp vào từng thẻ sản phẩm bên dưới để xem hình ảnh thực tế, thông số chi tiết hoặc đặt mua với nhiều ưu đãi nhé!");

        // Kiem tra bo loc ngan sach nghiem ngat
        if (criteria.maxPrice() != null) {
            suggested = suggested.stream()
                    .filter(p -> p.getLowestPrice() != null && p.getLowestPrice() <= criteria.maxPrice())
                    .collect(Collectors.toList());
        }

        return AiChatResponse.builder()
                .reply(sb.toString())
                .suggestedPhones(suggested)
                .build();
    }

    /**
     * Chuyen doi Phone Entity sang PhoneDTO day du thong tin.
     */
    private PhoneDTO toPhoneDto(Phone phone, Long lowestPrice) {
        PhoneDTO dto = phoneMapper.toDto(phone);
        dto.setLowestPrice(lowestPrice);
        dto.setMainImageUrl(getMainImageUrl(phone));
        dto.setVariantCount((long) (phone.getVariants() != null ? phone.getVariants().size() : 0));
        dto.setAvgRating(calculateAvgRating(phone));
        return dto;
    }

    private Long getLowestPrice(Phone phone) {
        if (phone.getVariants() == null || phone.getVariants().isEmpty()) return null;
        return phone.getVariants().stream()
                .map(v -> v.getDiscountPrice() != null ? v.getDiscountPrice() : v.getPrice())
                .filter(Objects::nonNull)
                .map(BigDecimal::longValue)
                .min(Long::compareTo)
                .orElse(null);
    }

    private String getMainImageUrl(Phone phone) {
        List<PhoneImage> images = phone.getImages();
        if (images == null || images.isEmpty()) return null;
        return images.stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                .map(PhoneImage::getImageUrl)
                .findFirst()
                .orElseGet(() -> images.get(0).getImageUrl());
    }

    private Double calculateAvgRating(Phone phone) {
        if (phone.getReviews() == null || phone.getReviews().isEmpty()) return 0.0;
        return phone.getReviews().stream()
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average()
                .orElse(0.0);
    }

    public record Criteria(Long minPrice, Long maxPrice, String brand, boolean cameraFocus, boolean batteryFocus, boolean gamingFocus) {}
    public record PhoneCandidate(Phone phone, Long lowestPrice, int score) {}
}
