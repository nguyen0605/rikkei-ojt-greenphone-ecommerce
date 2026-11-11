package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.WarrantyResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarrantyServiceTest {

    @Mock
    private WarrantyRepository warrantyRepository;

    @InjectMocks
    private WarrantyService warrantyService;

    private Order testOrder;
    private PhoneVariant testVariant;
    private Phone testPhone;

    @BeforeEach
    void setUp() {
        testPhone = Phone.builder()
                .name("iPhone 15 Pro Max")
                .images(List.of(
                        PhoneImage.builder().imageUrl("https://example.com/thumb.jpg").isMain(true).build()
                ))
                .build();
        testPhone.setId(100L);

        OptionItem ram = OptionItem.builder().value("8GB").build();
        OptionItem storage = OptionItem.builder().value("256GB").build();
        OptionItem color = OptionItem.builder().value("Titan Tự Nhiên").build();

        testVariant = PhoneVariant.builder()
                .phone(testPhone)
                .ramItem(ram)
                .storageItem(storage)
                .colorItem(color)
                .sku("IP15PM-256-NAT")
                .build();
        testVariant.setId(200L);

        OrderDetail detail1 = OrderDetail.builder()
                .phoneVariant(testVariant)
                .quantity(1)
                .productName("iPhone 15 Pro Max 256GB Titan Tự Nhiên")
                .build();

        OrderDetail detail2 = OrderDetail.builder()
                .phoneVariant(testVariant)
                .quantity(2)
                .productName("iPhone 15 Pro Max 256GB Titan Tự Nhiên")
                .build();

        testOrder = Order.builder()
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .orderStatus("COMPLETED")
                .orderDetails(new ArrayList<>(List.of(detail1, detail2)))
                .build();
        testOrder.setId(10L);
    }

    @Test
    @DisplayName("Kích hoạt bảo hành: Tự động sinh phiếu bảo hành 12 tháng theo số lượng máy và mã IMEI 15 số")
    void activateWarrantyForOrder_success() {
        when(warrantyRepository.existsByOrderId(10L)).thenReturn(false);
        when(warrantyRepository.existsByImeiNumber(anyString())).thenReturn(false);
        when(warrantyRepository.save(any(Warranty.class))).thenAnswer(inv -> {
            Warranty w = inv.getArgument(0);
            w.setId(1L);
            return w;
        });

        List<Warranty> result = warrantyService.activateWarrantyForOrder(testOrder);

        // Tổng số lượng máy: detail1 (1) + detail2 (2) = 3 máy -> 3 phiếu bảo hành
        assertThat(result).hasSize(3);
        verify(warrantyRepository, times(3)).save(any(Warranty.class));

        Warranty w = result.get(0);
        assertThat(w.getCustomerName()).isEqualTo("Nguyễn Văn A");
        assertThat(w.getCustomerPhone()).isEqualTo("0987654321");
        assertThat(w.getStatus()).isEqualTo("ACTIVE");
        assertThat(w.getImeiNumber()).hasSize(15);
        assertThat(w.getImeiNumber()).startsWith("86");

        // Kiểm tra thời hạn đúng 12 tháng
        assertThat(w.getEndDate()).isAfter(w.getStartDate());
        assertThat(w.getEndDate().getMonthValue()).isEqualTo(w.getStartDate().plusMonths(12).getMonthValue());

        // Kiểm tra tính hợp lệ của IMEI theo thuật toán Luhn
        String first14 = w.getImeiNumber().substring(0, 14);
        int expectedCheckDigit = warrantyService.calculateLuhnCheckDigit(first14);
        int actualCheckDigit = Character.getNumericValue(w.getImeiNumber().charAt(14));
        assertThat(actualCheckDigit).isEqualTo(expectedCheckDigit);
    }

    @Test
    @DisplayName("Idempotency: Đơn hàng đã kích hoạt bảo hành trước đó sẽ không tạo trùng lặp")
    void activateWarrantyForOrder_idempotent_doesNotDuplicate() {
        when(warrantyRepository.existsByOrderId(10L)).thenReturn(true);
        when(warrantyRepository.findByOrderId(10L)).thenReturn(List.of(
                Warranty.builder().imeiNumber("861111111111117").build()
        ));

        List<Warranty> result = warrantyService.activateWarrantyForOrder(testOrder);

        assertThat(result).hasSize(1);
        verify(warrantyRepository, never()).save(any(Warranty.class));
    }

    @Test
    @DisplayName("Thuật toán sinh IMEI: Đúng 15 chữ số và đạt chuẩn kiểm tra Luhn")
    void generateValidImei_satisfiesLuhnAlgorithm() {
        for (int i = 0; i < 50; i++) {
            String imei = warrantyService.generateValidImei();
            assertThat(imei).hasSize(15);
            assertThat(imei).matches("^\\d{15}$");

            String first14 = imei.substring(0, 14);
            int checkDigit = Character.getNumericValue(imei.charAt(14));
            assertThat(checkDigit).isEqualTo(warrantyService.calculateLuhnCheckDigit(first14));
        }
    }

    @Test
    @DisplayName("Tra cứu bảo hành công khai bằng số IMEI thành công")
    void searchWarranties_byImei_success() {
        Warranty warranty = Warranty.builder()
                .order(testOrder)
                .phoneVariant(testVariant)
                .imeiNumber("861234567890128")
                .customerName("Nguyễn Văn A")
                .customerPhone("0987654321")
                .startDate(LocalDateTime.now().minusDays(30))
                .endDate(LocalDateTime.now().plusDays(335))
                .status("ACTIVE")
                .build();
        warranty.setId(1L);

        when(warrantyRepository.searchByImeiOrPhone("861234567890128")).thenReturn(List.of(warranty));

        List<WarrantyResponse> responses = warrantyService.searchWarranties("861234567890128");

        assertThat(responses).hasSize(1);
        WarrantyResponse res = responses.get(0);
        assertThat(res.getImei()).isEqualTo("861234567890128");
        assertThat(res.getProductName()).isEqualTo("iPhone 15 Pro Max");
        assertThat(res.getThumbnailUrl()).isEqualTo("https://example.com/thumb.jpg");
        assertThat(res.getStatus()).isEqualTo("ACTIVE");
        assertThat(res.getRemainingDays()).isGreaterThan(330L);
        assertThat(res.getWarrantyDurationMonths()).isEqualTo(12);
    }

    @Test
    @DisplayName("Tra cứu bảo hành công khai bằng số điện thoại thành công")
    void searchWarranties_byPhone_success() {
        Warranty warranty = Warranty.builder()
                .order(testOrder)
                .phoneVariant(testVariant)
                .imeiNumber("861234567890128")
                .customerName("Nguyễn Văn A")
                .customerPhone("0987654321")
                .startDate(LocalDateTime.now().minusDays(10))
                .endDate(LocalDateTime.now().plusDays(355))
                .status("ACTIVE")
                .build();
        warranty.setId(1L);

        when(warrantyRepository.searchByImeiOrPhone("0987654321")).thenReturn(List.of(warranty));

        List<WarrantyResponse> responses = warrantyService.searchWarranties("0987654321");

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getCustomerPhone()).isEqualTo("0987654321");
    }

    @Test
    @DisplayName("Bảo hành đã quá ngày kết thúc: Tự động đổi trạng thái hiển thị sang EXPIRED và số ngày còn lại về 0")
    void searchWarranties_expiredWarranty_returnsExpiredStatus() {
        Warranty expiredWarranty = Warranty.builder()
                .order(testOrder)
                .phoneVariant(testVariant)
                .imeiNumber("869999999999991")
                .customerName("Nguyễn Văn A")
                .customerPhone("0987654321")
                .startDate(LocalDateTime.now().minusMonths(14))
                .endDate(LocalDateTime.now().minusMonths(2))
                .status("ACTIVE")
                .build();
        expiredWarranty.setId(2L);

        when(warrantyRepository.searchByImeiOrPhone("869999999999991")).thenReturn(List.of(expiredWarranty));

        List<WarrantyResponse> responses = warrantyService.searchWarranties("869999999999991");

        assertThat(responses).hasSize(1);
        WarrantyResponse res = responses.get(0);
        assertThat(res.getStatus()).isEqualTo("EXPIRED");
        assertThat(res.getRemainingDays()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Tra cứu với từ khóa rỗng hoặc null: Ném ngoại lệ BadRequestException")
    void searchWarranties_blankQuery_throwsBadRequest() {
        assertThrows(BadRequestException.class, () -> warrantyService.searchWarranties("   "));
        assertThrows(BadRequestException.class, () -> warrantyService.searchWarranties(null));
    }

    @Test
    @DisplayName("Tra cứu IMEI không tồn tại: Ném ngoại lệ ResourceNotFoundException")
    void getWarrantyByImei_notFound_throwsResourceNotFound() {
        when(warrantyRepository.findByImeiNumber("860000000000000")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> warrantyService.getWarrantyByImei("860000000000000"));
    }
}
