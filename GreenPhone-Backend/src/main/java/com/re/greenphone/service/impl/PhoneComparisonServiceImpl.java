package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.PhoneComparisonResponse;
import com.re.greenphone.dto.response.PhoneComparisonResponse.ComparedPhoneDTO;
import com.re.greenphone.dto.response.PhoneComparisonResponse.SpecGroupDTO;
import com.re.greenphone.dto.response.PhoneComparisonResponse.SpecItemDTO;
import com.re.greenphone.entity.OptionItem;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.service.PhoneComparisonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PhoneComparisonServiceImpl implements PhoneComparisonService {

    private final PhoneRepository phoneRepository;

    @Override
    @Transactional(readOnly = true)
    public PhoneComparisonResponse comparePhones(List<Long> phoneIds) {
        if (phoneIds == null || phoneIds.size() < 2) {
            throw new BadRequestException("Cần chọn ít nhất 2 sản phẩm để thực hiện so sánh");
        }
        if (phoneIds.size() > 4) {
            throw new BadRequestException("Chỉ hỗ trợ so sánh tối đa 4 sản phẩm cùng lúc");
        }

        // Kiểm tra không cho phép so sánh trùng sản phẩm
        Set<Long> uniqueIds = new HashSet<>(phoneIds);
        if (uniqueIds.size() < phoneIds.size()) {
            throw new BadRequestException("Không thể so sánh cùng một sản phẩm ở cả hai vị trí");
        }

        // Truy vấn tối ưu tránh N+1 Query
        List<Phone> fetchedPhones = phoneRepository.findPhonesForComparison(phoneIds);
        Map<Long, Phone> phoneMap = fetchedPhones.stream()
                .collect(Collectors.toMap(Phone::getId, p -> p));

        // Kiểm tra xem có ID nào không tìm thấy hoặc bị INACTIVE
        for (Long id : phoneIds) {
            if (!phoneMap.containsKey(id)) {
                throw new ResourceNotFoundException("Phone", "id", id);
            }
        }

        // Giữ đúng thứ tự các sản phẩm theo thứ tự tham số phoneIds truyền vào
        List<Phone> orderedPhones = phoneIds.stream()
                .map(phoneMap::get)
                .toList();

        // Xây dựng danh sách ComparedPhoneDTO
        List<ComparedPhoneDTO> comparedPhoneDTOs = orderedPhones.stream()
                .map(this::toComparedPhoneDTO)
                .toList();

        // Xây dựng các nhóm thông số kỹ thuật (SpecGroups) & phát hiện khác biệt
        List<String> differencesKeys = new ArrayList<>();
        List<SpecGroupDTO> specGroups = buildSpecGroups(orderedPhones, differencesKeys);

        return PhoneComparisonResponse.builder()
                .phones(comparedPhoneDTOs)
                .specGroups(specGroups)
                .differencesKeys(differencesKeys)
                .build();
    }

    private ComparedPhoneDTO toComparedPhoneDTO(Phone phone) {
        List<PhoneVariant> variants = phone.getVariants() != null ? phone.getVariants() : Collections.emptyList();

        BigDecimal minPrice = variants.stream()
                .map(PhoneVariant::getPrice)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null);

        BigDecimal maxPrice = variants.stream()
                .map(PhoneVariant::getPrice)
                .filter(Objects::nonNull)
                .max(BigDecimal::compareTo)
                .orElse(null);

        BigDecimal minDiscountPrice = variants.stream()
                .map(PhoneVariant::getDiscountPrice)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null);

        List<String> ramOptions = variants.stream()
                .map(PhoneVariant::getRamItem)
                .filter(Objects::nonNull)
                .map(OptionItem::getValue)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<String> storageOptions = variants.stream()
                .map(PhoneVariant::getStorageItem)
                .filter(Objects::nonNull)
                .map(OptionItem::getValue)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<String> colorOptions = variants.stream()
                .map(PhoneVariant::getColorItem)
                .filter(Objects::nonNull)
                .map(OptionItem::getValue)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        int totalStock = variants.stream()
                .mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                .sum();

        String mainImageUrl = null;
        if (phone.getImages() != null && !phone.getImages().isEmpty()) {
            mainImageUrl = phone.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                    .findFirst()
                    .or(() -> phone.getImages().stream().findFirst())
                    .map(PhoneImage::getImageUrl)
                    .orElse(null);
        }

        double avgRating = 0.0;
        long reviewCount = 0;
        if (phone.getReviews() != null && !phone.getReviews().isEmpty()) {
            avgRating = phone.getReviews().stream()
                    .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                    .average()
                    .orElse(0.0);
            reviewCount = phone.getReviews().size();
        }

        return ComparedPhoneDTO.builder()
                .id(phone.getId())
                .name(phone.getName())
                .brandId(phone.getBrand() != null ? phone.getBrand().getId() : null)
                .brandName(phone.getBrand() != null ? phone.getBrand().getName() : "")
                .mainImageUrl(mainImageUrl)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .minDiscountPrice(minDiscountPrice)
                .screen(phone.getScreen())
                .os(phone.getOs())
                .chip(phone.getChip())
                .rearCamera(phone.getRearCamera())
                .frontCamera(phone.getFrontCamera())
                .battery(phone.getBattery())
                .warranty(phone.getWarranty())
                .ramOptions(ramOptions)
                .storageOptions(storageOptions)
                .colorOptions(colorOptions)
                .avgRating(avgRating)
                .reviewCount(reviewCount)
                .totalStock(totalStock)
                .build();
    }

    private List<SpecGroupDTO> buildSpecGroups(List<Phone> phones, List<String> differencesKeys) {
        List<SpecGroupDTO> groups = new ArrayList<>();

        // 1. Thông tin chung
        List<SpecItemDTO> generalItems = new ArrayList<>();
        generalItems.add(createSpecItem("brand", "Hương hiệu / Hãng", phones,
                p -> p.getBrand() != null ? p.getBrand().getName() : null, differencesKeys));
        generalItems.add(createSpecItem("price", "Giá khởi điểm", phones,
                this::formatLowestPrice, differencesKeys));
        generalItems.add(createSpecItem("os", "Hệ điều hành", phones,
                Phone::getOs, differencesKeys));
        generalItems.add(createSpecItem("warranty", "Thời gian bảo hành", phones,
                Phone::getWarranty, differencesKeys));
        groups.add(SpecGroupDTO.builder()
                .groupKey("general")
                .groupName("Thông tin chung")
                .items(generalItems)
                .build());

        // 2. Màn hình
        List<SpecItemDTO> displayItems = new ArrayList<>();
        displayItems.add(createSpecItem("screen", "Màn hình", phones,
                Phone::getScreen, differencesKeys));
        groups.add(SpecGroupDTO.builder()
                .groupKey("display")
                .groupName("Màn hình")
                .items(displayItems)
                .build());

        // 3. Hiệu năng & Bộ nhớ
        List<SpecItemDTO> perfItems = new ArrayList<>();
        perfItems.add(createSpecItem("chip", "Vi xử lý (Chipset)", phones,
                Phone::getChip, differencesKeys));
        perfItems.add(createSpecItem("ram", "Bộ nhớ RAM", phones,
                this::formatRams, differencesKeys));
        perfItems.add(createSpecItem("storage", "Bộ nhớ trong (ROM)", phones,
                this::formatStorages, differencesKeys));
        groups.add(SpecGroupDTO.builder()
                .groupKey("performance")
                .groupName("Hiệu năng & Bộ nhớ")
                .items(perfItems)
                .build());

        // 4. Camera
        List<SpecItemDTO> cameraItems = new ArrayList<>();
        cameraItems.add(createSpecItem("rearCamera", "Camera sau", phones,
                Phone::getRearCamera, differencesKeys));
        cameraItems.add(createSpecItem("frontCamera", "Camera trước", phones,
                Phone::getFrontCamera, differencesKeys));
        groups.add(SpecGroupDTO.builder()
                .groupKey("camera")
                .groupName("Camera")
                .items(cameraItems)
                .build());

        // 5. Pin & Sạc
        List<SpecItemDTO> batteryItems = new ArrayList<>();
        batteryItems.add(createSpecItem("battery", "Dung lượng pin & Sạc", phones,
                Phone::getBattery, differencesKeys));
        groups.add(SpecGroupDTO.builder()
                .groupKey("battery")
                .groupName("Pin & Sạc")
                .items(batteryItems)
                .build());

        return groups;
    }

    private SpecItemDTO createSpecItem(String key, String label, List<Phone> phones,
                                       java.util.function.Function<Phone, String> extractor,
                                       List<String> differencesKeys) {
        Map<Long, String> values = new LinkedHashMap<>();
        for (Phone phone : phones) {
            String val = extractor.apply(phone);
            values.put(phone.getId(), (val != null && !val.isBlank()) ? val.trim() : "-");
        }

        // Tính toán khác biệt (chuẩn hóa khoảng trắng & chữ thường)
        boolean isDifferent = values.values().stream()
                .map(v -> v.trim().toLowerCase())
                .distinct()
                .count() > 1;

        if (isDifferent) {
            differencesKeys.add(key);
        }

        return SpecItemDTO.builder()
                .key(key)
                .label(label)
                .values(values)
                .isDifferent(isDifferent)
                .build();
    }

    private String formatLowestPrice(Phone phone) {
        if (phone.getVariants() == null || phone.getVariants().isEmpty()) {
            return "Đang cập nhật";
        }
        BigDecimal lowest = phone.getVariants().stream()
                .map(v -> v.getDiscountPrice() != null ? v.getDiscountPrice() : v.getPrice())
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null);

        if (lowest == null) {
            return "Đang cập nhật";
        }

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,###", symbols);
        return df.format(lowest) + " ₫";
    }

    private String formatRams(Phone phone) {
        if (phone.getVariants() == null || phone.getVariants().isEmpty()) {
            return "-";
        }
        List<String> list = phone.getVariants().stream()
                .map(PhoneVariant::getRamItem)
                .filter(Objects::nonNull)
                .map(OptionItem::getValue)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return list.isEmpty() ? "-" : String.join(", ", list);
    }

    private String formatStorages(Phone phone) {
        if (phone.getVariants() == null || phone.getVariants().isEmpty()) {
            return "-";
        }
        List<String> list = phone.getVariants().stream()
                .map(PhoneVariant::getStorageItem)
                .filter(Objects::nonNull)
                .map(OptionItem::getValue)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return list.isEmpty() ? "-" : String.join(", ", list);
    }
}
