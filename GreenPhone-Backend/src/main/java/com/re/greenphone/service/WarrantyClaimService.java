package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WarrantyClaimCreateRequest;
import com.re.greenphone.dto.response.WarrantyClaimHistoryResponse;
import com.re.greenphone.dto.response.WarrantyClaimResponse;
import com.re.greenphone.entity.Warranty;
import com.re.greenphone.entity.WarrantyClaim;
import com.re.greenphone.entity.WarrantyClaimHistory;
import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.repository.WarrantyClaimHistoryRepository;
import com.re.greenphone.repository.WarrantyClaimRepository;
import com.re.greenphone.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarrantyClaimService {

    private final WarrantyRepository warrantyRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;
    private final WarrantyClaimHistoryRepository warrantyClaimHistoryRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    /**
     * Tiếp nhận yêu cầu sửa chữa/bảo hành theo số IMEI thiết bị
     */
    @Transactional
    public WarrantyClaimResponse createClaim(WarrantyClaimCreateRequest request) {
        log.info("Tiếp nhận yêu cầu bảo hành cho IMEI: {}, lỗi: {}", request.getImeiNumber(), request.getHardwareIssueType());

        // 1. Đối chiếu IMEI trong bảng warranty
        Warranty warranty = warrantyRepository.findByImeiNumber(request.getImeiNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy thông tin bảo hành cho số IMEI: " + request.getImeiNumber()));

        // 2. Kiểm tra tính hợp lệ của thời hạn bảo hành
        LocalDateTime now = LocalDateTime.now();
        boolean isUnderWarranty = warranty.getEndDate() != null
                && !now.isAfter(warranty.getEndDate())
                && "ACTIVE".equalsIgnoreCase(warranty.getStatus());

        // 3. Phân định chi phí sửa chữa
        BigDecimal repairCost;
        if (isUnderWarranty) {
            repairCost = BigDecimal.ZERO;
        } else {
            repairCost = (request.getRepairCost() != null && request.getRepairCost().compareTo(BigDecimal.ZERO) >= 0)
                    ? request.getRepairCost()
                    : BigDecimal.ZERO;
        }

        // 4. Sinh mã RMA duy nhất dạng RMA-YYYYMMDD-XXXX
        String claimCode = generateUniqueClaimCode();

        // 5. Khởi tạo bản ghi WarrantyClaim
        String staffName = (request.getReceivedByName() != null && !request.getReceivedByName().isBlank())
                ? request.getReceivedByName().trim()
                : "Hệ thống tiếp nhận";

        WarrantyClaim claim = WarrantyClaim.builder()
                .claimCode(claimCode)
                .warranty(warranty)
                .hardwareIssueType(request.getHardwareIssueType())
                .issueDescription(request.getIssueDescription().trim())
                .status(ClaimStatus.SUBMITTED)
                .isUnderWarranty(isUnderWarranty)
                .repairCost(repairCost)
                .customerNote(request.getCustomerNote() != null ? request.getCustomerNote().trim() : null)
                .createdByName(staffName)
                .receivedAt(now)
                .build();

        WarrantyClaim savedClaim = warrantyClaimRepository.save(claim);

        // 6. Lưu vết lịch sử tiến trình đầu tiên vào warranty_claim_history
        String historyNote = isUnderWarranty
                ? "Tiếp nhận bảo hành miễn phí (thiết bị còn thời hạn bảo hành)"
                : "Tiếp nhận sửa chữa dịch vụ có tính phí (thiết bị đã hết hạn bảo hành)";

        WarrantyClaimHistory history = WarrantyClaimHistory.builder()
                .warrantyClaim(savedClaim)
                .fromStatus(null)
                .toStatus(ClaimStatus.SUBMITTED)
                .action("SUBMITTED")
                .note(historyNote)
                .performedByName(staffName)
                .createdAt(now)
                .build();

        warrantyClaimHistoryRepository.save(history);

        log.info("Tạo thành công phiếu tiếp nhận bảo hành: {} cho IMEI: {}, diện bảo hành: {}",
                claimCode, request.getImeiNumber(), isUnderWarranty);

        return mapToResponse(savedClaim, List.of(history));
    }

    /**
     * Tra cứu chi tiết phiếu tiếp nhận theo ID
     */
    @Transactional(readOnly = true)
    public WarrantyClaimResponse getClaimById(Long id) {
        WarrantyClaim claim = warrantyClaimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu bảo hành", "id", id));
        List<WarrantyClaimHistory> histories = warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(claim.getId());
        return mapToResponse(claim, histories);
    }

    /**
     * Tra cứu chi tiết phiếu tiếp nhận theo mã RMA
     */
    @Transactional(readOnly = true)
    public WarrantyClaimResponse getClaimByCode(String claimCode) {
        WarrantyClaim claim = warrantyClaimRepository.findByClaimCode(claimCode)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu bảo hành", "claimCode", claimCode));
        List<WarrantyClaimHistory> histories = warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(claim.getId());
        return mapToResponse(claim, histories);
    }

    /**
     * Lấy danh sách phiếu tiếp nhận theo số IMEI
     */
    @Transactional(readOnly = true)
    public List<WarrantyClaimResponse> getClaimsByImei(String imeiNumber) {
        return warrantyClaimRepository.findByWarranty_ImeiNumber(imeiNumber).stream()
                .map(c -> {
                    List<WarrantyClaimHistory> histories = warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(c.getId());
                    return mapToResponse(c, histories);
                })
                .collect(Collectors.toList());
    }

    /**
     * Lấy tất cả phiếu bảo hành, có thể lọc theo trạng thái
     */
    @Transactional(readOnly = true)
    public List<WarrantyClaimResponse> getAllClaims(ClaimStatus status) {
        List<WarrantyClaim> claims = (status != null)
                ? warrantyClaimRepository.findByStatus(status)
                : warrantyClaimRepository.findAll();

        return claims.stream()
                .map(c -> {
                    List<WarrantyClaimHistory> histories = warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(c.getId());
                    return mapToResponse(c, histories);
                })
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật trạng thái phiếu bảo hành và ghi lịch sử tiến trình
     */
    @Transactional
    public WarrantyClaimResponse updateClaimStatus(Long id, ClaimStatus newStatus, String resolution, String note, String performedByName) {
        WarrantyClaim claim = warrantyClaimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu bảo hành", "id", id));

        ClaimStatus oldStatus = claim.getStatus();
        if (oldStatus == newStatus) {
            throw new BadRequestException("Phiếu bảo hành đã ở trạng thái: " + newStatus);
        }

        claim.setStatus(newStatus);
        if (resolution != null && !resolution.isBlank()) {
            claim.setResolution(resolution.trim());
        }
        if (newStatus == ClaimStatus.COMPLETED) {
            claim.setCompletedAt(LocalDateTime.now());
        }

        WarrantyClaim updatedClaim = warrantyClaimRepository.save(claim);

        WarrantyClaimHistory history = WarrantyClaimHistory.builder()
                .warrantyClaim(updatedClaim)
                .fromStatus(oldStatus)
                .toStatus(newStatus)
                .action("STATUS_UPDATE")
                .note(note != null ? note.trim() : "Chuyển trạng thái từ " + oldStatus + " sang " + newStatus)
                .performedByName(performedByName != null ? performedByName : "Quản trị viên")
                .createdAt(LocalDateTime.now())
                .build();

        warrantyClaimHistoryRepository.save(history);

        List<WarrantyClaimHistory> histories = warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(updatedClaim.getId());
        return mapToResponse(updatedClaim, histories);
    }

    /**
     * Sinh mã tiếp nhận RMA không trùng lặp theo format RMA-YYYYMMDD-XXXX
     */
    private String generateUniqueClaimCode() {
        String datePart = LocalDate.now().format(DATE_FORMATTER);
        String code;
        int maxAttempts = 10;
        int attempt = 0;

        do {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
            code = "RMA-" + datePart + "-" + suffix;
            attempt++;
            if (attempt > maxAttempts) {
                long fallbackNumber = Math.abs(System.currentTimeMillis() % 10000);
                code = String.format("RMA-%s-%04d", datePart, fallbackNumber);
                break;
            }
        } while (warrantyClaimRepository.existsByClaimCode(code));

        return code;
    }

    /**
     * Chuyển đổi Entity sang Response DTO
     */
    private WarrantyClaimResponse mapToResponse(WarrantyClaim claim, List<WarrantyClaimHistory> histories) {
        Warranty w = claim.getWarranty();

        List<WarrantyClaimHistoryResponse> historyResponses = (histories != null)
                ? histories.stream().map(h -> WarrantyClaimHistoryResponse.builder()
                        .id(h.getId())
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .action(h.getAction())
                        .note(h.getNote())
                        .performedByName(h.getPerformedByName())
                        .createdAt(h.getCreatedAt())
                        .build()).collect(Collectors.toList())
                : Collections.emptyList();

        return WarrantyClaimResponse.builder()
                .id(claim.getId())
                .claimCode(claim.getClaimCode())
                .warrantyId(w != null ? w.getId() : null)
                .imeiNumber(w != null ? w.getImeiNumber() : null)
                .productName(resolveProductName(w))
                .customerName(w != null ? w.getCustomerName() : null)
                .customerPhone(w != null ? w.getCustomerPhone() : null)
                .hardwareIssueType(claim.getHardwareIssueType())
                .issueDescription(claim.getIssueDescription())
                .status(claim.getStatus())
                .isUnderWarranty(claim.getIsUnderWarranty())
                .repairCost(claim.getRepairCost())
                .resolution(claim.getResolution())
                .rejectionReason(claim.getRejectionReason())
                .customerNote(claim.getCustomerNote())
                .createdByName(claim.getCreatedByName())
                .receivedByName(claim.getReceivedBy() != null ? claim.getReceivedBy().getFullName() : claim.getCreatedByName())
                .receivedAt(claim.getReceivedAt())
                .completedAt(claim.getCompletedAt())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .warrantyEndDate(w != null ? w.getEndDate() : null)
                .warrantyStatus(w != null ? w.getStatus() : null)
                .histories(historyResponses)
                .build();
    }

    private String resolveProductName(Warranty warranty) {
        if (warranty == null || warranty.getPhoneVariant() == null) {
            return "Thiết bị GreenPhone";
        }
        var variant = warranty.getPhoneVariant();
        StringBuilder sb = new StringBuilder();
        if (variant.getPhone() != null && variant.getPhone().getName() != null) {
            sb.append(variant.getPhone().getName());
        }
        if (variant.getRamItem() != null && variant.getRamItem().getValue() != null) {
            sb.append(" ").append(variant.getRamItem().getValue());
        }
        if (variant.getStorageItem() != null && variant.getStorageItem().getValue() != null) {
            sb.append("/").append(variant.getStorageItem().getValue());
        }
        if (variant.getColorItem() != null && variant.getColorItem().getValue() != null) {
            sb.append(" - ").append(variant.getColorItem().getValue());
        }
        return sb.toString().trim();
    }
}
