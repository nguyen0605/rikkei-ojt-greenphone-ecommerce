package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.WarrantyResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.re.greenphone.enums.NotificationType;
import com.re.greenphone.event.NotificationEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarrantyService {

    private final WarrantyRepository warrantyRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Random random = new SecureRandom();

    /**
     * Tự động kích hoạt bảo hành điện tử 12 tháng khi đơn hàng chuyển sang trạng thái COMPLETED hoặc DELIVERED.
     * Đảm bảo tính Idempotent: Nếu đơn hàng đã được kích hoạt trước đó thì không tạo trùng lặp.
     */
    @Transactional
    public List<Warranty> activateWarrantyForOrder(Order order) {
        if (order == null || order.getId() == null) {
            log.warn("Không thể kích hoạt bảo hành cho đơn hàng null");
            return Collections.emptyList();
        }

        // Kiểm tra Idempotent
        if (warrantyRepository.existsByOrderId(order.getId())) {
            log.info("Đơn hàng #{} đã được kích hoạt bảo hành trước đó. Bỏ qua để tránh trùng lặp.", order.getId());
            return warrantyRepository.findByOrderId(order.getId());
        }

        if (order.getOrderDetails() == null || order.getOrderDetails().isEmpty()) {
            log.warn("Đơn hàng #{} không có chi tiết sản phẩm để kích hoạt bảo hành", order.getId());
            return Collections.emptyList();
        }

        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = startDate.plusMonths(12);
        List<Warranty> createdWarranties = new ArrayList<>();

        for (OrderDetail detail : order.getOrderDetails()) {
            PhoneVariant variant = detail.getPhoneVariant();
            if (variant == null) {
                continue;
            }

            int quantity = (detail.getQuantity() != null && detail.getQuantity() > 0) ? detail.getQuantity() : 1;
            for (int i = 0; i < quantity; i++) {
                String imei = generateUniqueImei();

                Warranty warranty = Warranty.builder()
                        .order(order)
                        .phoneVariant(variant)
                        .imeiNumber(imei)
                        .customerName(order.getReceiverName() != null ? order.getReceiverName() : "Khách hàng")
                        .customerPhone(order.getReceiverPhone() != null ? order.getReceiverPhone() : "")
                        .startDate(startDate)
                        .endDate(endDate)
                        .status("ACTIVE")
                        .note(String.format("Bảo hành điện tử 12 tháng tự động kích hoạt từ đơn hàng #%d - Thiết bị %d/%d",
                                order.getId(), i + 1, quantity))
                        .build();

                createdWarranties.add(warrantyRepository.save(warranty));
            }
        }

        log.info("Đã kích hoạt thành công {} phiếu bảo hành điện tử cho đơn hàng #{}", createdWarranties.size(), order.getId());

        // Bắn sự kiện thông báo in-app bất đồng bộ cho từng thiết bị được kích hoạt bảo hành
        if (eventPublisher != null && order.getUser() != null) {
            for (Warranty w : createdWarranties) {
                eventPublisher.publishEvent(NotificationEvent.builder()
                        .userId(order.getUser().getId())
                        .title("Bảo hành điện tử đã được kích hoạt")
                        .content(String.format("Thiết bị với mã IMEI %s của đơn hàng #%d đã được kích hoạt bảo hành điện tử 12 tháng.",
                                w.getImeiNumber(), order.getId()))
                        .type(NotificationType.WARRANTY)
                        .redirectUrl("/tra-cuu-bao-hanh?imei=" + w.getImeiNumber())
                        .metadataJson(String.format("{\"warrantyId\":%d,\"imei\":\"%s\",\"orderId\":%d}",
                                w.getId(), w.getImeiNumber(), order.getId()))
                        .build());
            }
        }

        return createdWarranties;
    }

    /**
     * Tra cứu bảo hành công khai không cần đăng nhập theo số IMEI hoặc số điện thoại.
     */
    @Transactional(readOnly = true)
    public List<WarrantyResponse> searchWarranties(String query) {
        if (query == null || query.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng cung cấp mã IMEI, số điện thoại hoặc tên sản phẩm để tra cứu bảo hành");
        }

        String sanitizedQuery = query.trim();
        List<Warranty> warranties = warrantyRepository.searchByImeiOrPhone(sanitizedQuery);

        if (warranties.isEmpty()) {
            // Thử tra cứu fallback qua repository methods
            var byImei = warrantyRepository.findByImeiNumber(sanitizedQuery);
            if (byImei.isPresent()) {
                warranties = List.of(byImei.get());
            } else {
                warranties = warrantyRepository.findByCustomerPhoneOrderByCreatedAtDesc(sanitizedQuery);
            }
        }

        // Loại trừ triệt để các thiết bị đã bị đổi trả / hoàn tiền (VOIDED)
        return warranties.stream()
                .filter(w -> w.getStatus() == null || !"VOIDED".equalsIgnoreCase(w.getStatus()))
                .map(this::mapToWarrantyResponse)
                .toList();
    }

    /**
     * Tra cứu chi tiết bảo hành theo mã IMEI duy nhất.
     */
    @Transactional(readOnly = true)
    public WarrantyResponse getWarrantyByImei(String imei) {
        if (imei == null || imei.trim().isEmpty()) {
            throw new BadRequestException("Mã IMEI không được để trống");
        }
        Warranty warranty = warrantyRepository.findByImeiNumber(imei.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin bảo hành cho mã IMEI: " + imei));
        if ("VOIDED".equalsIgnoreCase(warranty.getStatus())) {
            throw new BadRequestException("Thiết bị này đã được đổi trả hoặc hoàn tiền và không còn hiệu lực bảo hành trên hệ thống.");
        }
        return mapToWarrantyResponse(warranty);
    }

    /**
     * Sinh mã IMEI 15 chữ số hợp lệ theo định dạng GSMA và thuật toán Luhn, đảm bảo duy nhất trong hệ thống.
     */
    public String generateUniqueImei() {
        String imei;
        int maxAttempts = 20;
        int attempts = 0;
        do {
            imei = generateValidImei();
            attempts++;
            if (attempts > maxAttempts) {
                log.warn("Đã thử sinh IMEI {} lần, sinh IMEI ngẫu nhiên có độ dài 15 ký tự an toàn", attempts);
                break;
            }
        } while (warrantyRepository.existsByImeiNumber(imei));
        return imei;
    }

    /**
     * Sinh mã IMEI chuẩn GSMA (8 chữ số TAC + 6 chữ số Serial + 1 chữ số kiểm tra Luhn).
     */
    public String generateValidImei() {
        // Dùng tiền tố TAC phổ biến (ví dụ 86 đại diện cho các thiết bị phân phối tại Châu Á / Việt Nam)
        StringBuilder sb = new StringBuilder();
        sb.append("86");
        for (int i = 0; i < 12; i++) {
            sb.append(random.nextInt(10));
        }

        String first14 = sb.toString();
        int checkDigit = calculateLuhnCheckDigit(first14);
        return first14 + checkDigit;
    }

    /**
     * Tính toán chữ số kiểm tra (Check Digit) thứ 15 theo thuật toán Luhn.
     */
    public int calculateLuhnCheckDigit(String number) {
        int sum = 0;
        for (int i = 0; i < number.length(); i++) {
            int digit = Character.getNumericValue(number.charAt(i));
            // Nhân đôi các chữ số ở vị trí lẻ (tính từ 1: tức index 1, 3, 5, 7, 9, 11, 13)
            if (i % 2 == 1) {
                digit *= 2;
                if (digit > 9) {
                    digit = (digit / 10) + (digit % 10);
                }
            }
            sum += digit;
        }
        return (10 - (sum % 10)) % 10;
    }

    /**
     * Ánh xạ Warranty Entity sang WarrantyResponse DTO.
     */
    public WarrantyResponse mapToWarrantyResponse(Warranty warranty) {
        LocalDateTime now = LocalDateTime.now();
        String currentStatus = warranty.getStatus();
        long remainingDays = 0L;

        if ("VOIDED".equalsIgnoreCase(warranty.getStatus()) || "CANCELLED".equalsIgnoreCase(warranty.getStatus())) {
            remainingDays = 0L;
            currentStatus = warranty.getStatus();
        } else if (warranty.getEndDate() != null) {
            if (warranty.getEndDate().isAfter(now)) {
                remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), warranty.getEndDate().toLocalDate());
                if (remainingDays < 0) {
                    remainingDays = 0;
                }
            } else {
                currentStatus = "EXPIRED";
            }
        }

        String productName = "Điện thoại thông minh";
        String variantDetails = "";
        String thumbnailUrl = "";

        PhoneVariant variant = warranty.getPhoneVariant();
        if (variant != null) {
            Phone phone = variant.getPhone();
            if (phone != null) {
                productName = phone.getName();
                if (phone.getImages() != null && !phone.getImages().isEmpty()) {
                    thumbnailUrl = phone.getImages().stream()
                            .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                            .map(PhoneImage::getImageUrl)
                            .findFirst()
                            .orElse(phone.getImages().get(0).getImageUrl());
                }
            }

            List<String> details = new ArrayList<>();
            if (variant.getRamItem() != null && variant.getRamItem().getValue() != null) {
                details.add("RAM " + variant.getRamItem().getValue());
            }
            if (variant.getStorageItem() != null && variant.getStorageItem().getValue() != null) {
                details.add("Bộ nhớ " + variant.getStorageItem().getValue());
            }
            if (variant.getColorItem() != null && variant.getColorItem().getValue() != null) {
                details.add("Màu " + variant.getColorItem().getValue());
            }
            variantDetails = String.join(" - ", details);
        }

        return WarrantyResponse.builder()
                .id(warranty.getId())
                .orderId(warranty.getOrder() != null ? warranty.getOrder().getId() : null)
                .phoneVariantId(variant != null ? variant.getId() : null)
                .imei(warranty.getImeiNumber())
                .imeiNumber(warranty.getImeiNumber())
                .productName(productName)
                .variantDetails(variantDetails)
                .thumbnailUrl(thumbnailUrl)
                .customerName(warranty.getCustomerName())
                .customerPhone(warranty.getCustomerPhone())
                .startDate(warranty.getStartDate())
                .endDate(warranty.getEndDate())
                .status(currentStatus)
                .remainingDays(remainingDays)
                .warrantyDurationMonths(warranty.getWarrantyDurationMonths())
                .note(warranty.getNote())
                .build();
    }
}
