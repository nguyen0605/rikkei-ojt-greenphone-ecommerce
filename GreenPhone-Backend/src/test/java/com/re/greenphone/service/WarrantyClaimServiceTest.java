package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WarrantyClaimCreateRequest;
import com.re.greenphone.dto.response.WarrantyClaimResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.enums.ClaimStatus;
import com.re.greenphone.enums.HardwareIssueType;
import com.re.greenphone.repository.WarrantyClaimHistoryRepository;
import com.re.greenphone.repository.WarrantyClaimRepository;
import com.re.greenphone.repository.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarrantyClaimServiceTest {

    @Mock
    private WarrantyRepository warrantyRepository;

    @Mock
    private WarrantyClaimRepository warrantyClaimRepository;

    @Mock
    private WarrantyClaimHistoryRepository warrantyClaimHistoryRepository;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private WarrantyClaimService warrantyClaimService;

    private Warranty activeWarranty;
    private Warranty expiredWarranty;

    @BeforeEach
    void setUp() {
        Phone phone = new Phone();
        phone.setName("iPhone 15 Pro Max");

        OptionItem ram = new OptionItem();
        ram.setValue("8GB");

        OptionItem storage = new OptionItem();
        storage.setValue("256GB");

        OptionItem color = new OptionItem();
        color.setValue("Titan Tự Nhiên");

        PhoneVariant variant = PhoneVariant.builder()
                .phone(phone)
                .ramItem(ram)
                .storageItem(storage)
                .colorItem(color)
                .price(new BigDecimal("30000000"))
                .build();

        activeWarranty = Warranty.builder()
                .imeiNumber("860123456789012")
                .customerName("Nguyễn Văn A")
                .customerPhone("0987654321")
                .startDate(LocalDateTime.now().minusMonths(2))
                .endDate(LocalDateTime.now().plusMonths(10))
                .status("ACTIVE")
                .phoneVariant(variant)
                .build();
        activeWarranty.setId(1L);

        expiredWarranty = Warranty.builder()
                .imeiNumber("860999999999999")
                .customerName("Trần Thị B")
                .customerPhone("0912345678")
                .startDate(LocalDateTime.now().minusMonths(14))
                .endDate(LocalDateTime.now().minusMonths(2))
                .status("EXPIRED")
                .phoneVariant(variant)
                .build();
        expiredWarranty.setId(2L);
    }

    @Test
    @DisplayName("Tiếp nhận thiết bị còn hạn bảo hành: isUnderWarranty = true, repairCost = 0")
    void testCreateClaim_UnderWarranty_Success() {
        WarrantyClaimCreateRequest request = WarrantyClaimCreateRequest.builder()
                .imeiNumber("860123456789012")
                .hardwareIssueType(HardwareIssueType.SCREEN)
                .issueDescription("Màn hình bị sọc xanh")
                .repairCost(new BigDecimal("2000000")) // Dù client gửi số tiền, còn hạn vẫn phải miễn phí
                .receivedByName("KTV Hùng")
                .build();

        when(warrantyRepository.findByImeiNumber("860123456789012")).thenReturn(Optional.of(activeWarranty));
        when(warrantyClaimRepository.existsByClaimCode(anyString())).thenReturn(false);
        when(warrantyClaimRepository.save(any(WarrantyClaim.class))).thenAnswer(invocation -> {
            WarrantyClaim c = invocation.getArgument(0);
            c.setId(10L);
            return c;
        });

        WarrantyClaimResponse response = warrantyClaimService.createClaim(request);

        assertThat(response).isNotNull();
        assertThat(response.getClaimCode()).startsWith("RMA-");
        assertThat(response.getImeiNumber()).isEqualTo("860123456789012");
        assertThat(response.getHardwareIssueType()).isEqualTo(HardwareIssueType.SCREEN);
        assertThat(response.getIsUnderWarranty()).isTrue();
        assertThat(response.getRepairCost()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(response.getCreatedByName()).isEqualTo("KTV Hùng");
        assertThat(response.getProductName()).contains("iPhone 15 Pro Max");

        verify(warrantyClaimRepository, times(1)).save(any(WarrantyClaim.class));
        verify(warrantyClaimHistoryRepository, times(1)).save(any(WarrantyClaimHistory.class));
    }

    @Test
    @DisplayName("Tiếp nhận thiết bị đã hết hạn bảo hành: isUnderWarranty = false, tính phí theo request")
    void testCreateClaim_OutOfWarranty_WithCost_Success() {
        BigDecimal expectedCost = new BigDecimal("450000.00");
        WarrantyClaimCreateRequest request = WarrantyClaimCreateRequest.builder()
                .imeiNumber("860999999999999")
                .hardwareIssueType(HardwareIssueType.BATTERY)
                .issueDescription("Pin chai phù nắp lưng")
                .repairCost(expectedCost)
                .customerNote("Khách đồng ý giá thay pin")
                .receivedByName("KTV Tuấn")
                .build();

        when(warrantyRepository.findByImeiNumber("860999999999999")).thenReturn(Optional.of(expiredWarranty));
        when(warrantyClaimRepository.existsByClaimCode(anyString())).thenReturn(false);
        when(warrantyClaimRepository.save(any(WarrantyClaim.class))).thenAnswer(invocation -> {
            WarrantyClaim c = invocation.getArgument(0);
            c.setId(11L);
            return c;
        });

        WarrantyClaimResponse response = warrantyClaimService.createClaim(request);

        assertThat(response).isNotNull();
        assertThat(response.getClaimCode()).startsWith("RMA-");
        assertThat(response.getImeiNumber()).isEqualTo("860999999999999");
        assertThat(response.getHardwareIssueType()).isEqualTo(HardwareIssueType.BATTERY);
        assertThat(response.getIsUnderWarranty()).isFalse();
        assertThat(response.getRepairCost()).isEqualByComparingTo(expectedCost);
        assertThat(response.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(response.getCustomerNote()).isEqualTo("Khách đồng ý giá thay pin");

        verify(warrantyClaimRepository, times(1)).save(any(WarrantyClaim.class));
        verify(warrantyClaimHistoryRepository, times(1)).save(any(WarrantyClaimHistory.class));
    }

    @Test
    @DisplayName("Tiếp nhận số IMEI không tồn tại trong hệ thống: Ném ResourceNotFoundException")
    void testCreateClaim_ImeiNotFound_ThrowsResourceNotFoundException() {
        WarrantyClaimCreateRequest request = WarrantyClaimCreateRequest.builder()
                .imeiNumber("860000000000000")
                .hardwareIssueType(HardwareIssueType.MOTHERBOARD)
                .issueDescription("Mất nguồn")
                .build();

        when(warrantyRepository.findByImeiNumber("860000000000000")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> warrantyClaimService.createClaim(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("860000000000000");

        verify(warrantyClaimRepository, never()).save(any(WarrantyClaim.class));
        verify(warrantyClaimHistoryRepository, never()).save(any(WarrantyClaimHistory.class));
    }

    @Test
    @DisplayName("Tra cứu phiếu bảo hành theo ID thành công")
    void testGetClaimById_Success() {
        WarrantyClaim claim = WarrantyClaim.builder()
                .claimCode("RMA-20261111-TEST")
                .warranty(activeWarranty)
                .hardwareIssueType(HardwareIssueType.CAMERA)
                .issueDescription("Camera mờ")
                .status(ClaimStatus.SUBMITTED)
                .isUnderWarranty(true)
                .repairCost(BigDecimal.ZERO)
                .build();
        claim.setId(100L);

        WarrantyClaimHistory history = WarrantyClaimHistory.builder()
                .id(1L)
                .warrantyClaim(claim)
                .toStatus(ClaimStatus.SUBMITTED)
                .action("SUBMITTED")
                .note("Tiếp nhận ban đầu")
                .createdAt(LocalDateTime.now())
                .build();

        when(warrantyClaimRepository.findById(100L)).thenReturn(Optional.of(claim));
        when(warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(100L))
                .thenReturn(List.of(history));

        WarrantyClaimResponse response = warrantyClaimService.getClaimById(100L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getClaimCode()).isEqualTo("RMA-20261111-TEST");
        assertThat(response.getHistories()).hasSize(1);
    }

    @Test
    @DisplayName("Tra cứu phiếu bảo hành theo ID không tồn tại: Ném ResourceNotFoundException")
    void testGetClaimById_NotFound() {
        when(warrantyClaimRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> warrantyClaimService.getClaimById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Cập nhật trạng thái phiếu bảo hành và ghi nhận lịch sử tiến trình")
    void testUpdateClaimStatus_Success() {
        WarrantyClaim claim = WarrantyClaim.builder()
                .claimCode("RMA-20261111-TEST")
                .warranty(activeWarranty)
                .hardwareIssueType(HardwareIssueType.SCREEN)
                .issueDescription("Màn hình sọc")
                .status(ClaimStatus.SUBMITTED)
                .isUnderWarranty(true)
                .repairCost(BigDecimal.ZERO)
                .build();
        claim.setId(200L);

        when(warrantyClaimRepository.findById(200L)).thenReturn(Optional.of(claim));
        when(warrantyClaimRepository.save(any(WarrantyClaim.class))).thenAnswer(i -> i.getArgument(0));
        when(warrantyClaimHistoryRepository.findByWarrantyClaimIdOrderByCreatedAtDesc(200L))
                .thenReturn(Collections.emptyList());

        WarrantyClaimResponse response = warrantyClaimService.updateClaimStatus(
                200L, ClaimStatus.IN_INSPECTION, null, "Kỹ thuật viên đang kiểm tra màn hình", "KTV Minh");

        assertThat(response.getStatus()).isEqualTo(ClaimStatus.IN_INSPECTION);
        verify(warrantyClaimRepository).save(claim);
        verify(warrantyClaimHistoryRepository).save(any(WarrantyClaimHistory.class));
    }

    @Test
    @DisplayName("Cập nhật trạng thái trùng với trạng thái hiện tại: Ném BadRequestException")
    void testUpdateClaimStatus_SameStatus_ThrowsBadRequest() {
        WarrantyClaim claim = WarrantyClaim.builder()
                .claimCode("RMA-20261111-TEST")
                .warranty(activeWarranty)
                .status(ClaimStatus.SUBMITTED)
                .build();
        claim.setId(201L);

        when(warrantyClaimRepository.findById(201L)).thenReturn(Optional.of(claim));

        assertThatThrownBy(() -> warrantyClaimService.updateClaimStatus(
                201L, ClaimStatus.SUBMITTED, null, "Trùng trạng thái", "Admin"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("SUBMITTED");
    }
}
