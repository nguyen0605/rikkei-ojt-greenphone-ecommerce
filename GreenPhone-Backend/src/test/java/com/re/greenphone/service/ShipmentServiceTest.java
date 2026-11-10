package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.CreateShipmentRequest;
import com.re.greenphone.dto.request.UpdateShipmentStatusRequest;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
@DisplayName("ShipmentService Unit & Business Flow Tests")
class ShipmentServiceTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private ShipmentHistoryRepository shipmentHistoryRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private WarrantyRepository warrantyRepository;

    @InjectMocks
    private ShipmentService shipmentService;

    private Order sampleOrder;
    private PhoneVariant sampleVariant;

    @BeforeEach
    void setUp() {
        sampleVariant = PhoneVariant.builder()
                .price(BigDecimal.valueOf(30000000))
                .stockQuantity(10)
                .build();
        sampleVariant.setId(100L);

        sampleOrder = Order.builder()
                .receiverName("Trần Văn B")
                .receiverPhone("0912345678")
                .shippingAddress("456 Lê Lợi, Quận 1, TP.HCM")
                .totalAmount(BigDecimal.valueOf(30000000))
                .finalAmount(BigDecimal.valueOf(30000000))
                .orderStatus("PROCESSING")
                .paymentStatus("UNPAID")
                .paymentMethod("COD")
                .orderDetails(new ArrayList<>())
                .build();
        sampleOrder.setId(1L);

        OrderDetail detail = OrderDetail.builder()
                .order(sampleOrder)
                .phoneVariant(sampleVariant)
                .productName("iPhone 15 Pro Max")
                .ram("8GB")
                .storage("256GB")
                .color("Titan Tự Nhiên")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(30000000))
                .subtotal(BigDecimal.valueOf(30000000))
                .build();
        sampleOrder.getOrderDetails().add(detail);
    }

    @Test
    @DisplayName("Quy tắc bắt buộc: Từ chối tạo Shipment nếu Order không ở trạng thái PROCESSING")
    void testCreateShipment_WhenOrderNotProcessing_ThrowsException() {
        sampleOrder.setOrderStatus("PENDING");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        CreateShipmentRequest req = CreateShipmentRequest.builder()
                .orderId(1L)
                .carrierCode("GHN")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> shipmentService.createShipment(req));
        assertThat(ex.getMessage()).contains("Order must be in PROCESSING status");
        verify(shipmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạo Shipment thành công khi Order ở trạng thái PROCESSING, Order tự chuyển sang SHIPPING")
    void testCreateShipment_Success() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(shipmentRepository.existsByTrackingNumber(anyString())).thenReturn(false);
        when(shipmentRepository.save(any(Shipment.class))).thenAnswer(invocation -> {
            Shipment s = invocation.getArgument(0);
            s.setId(10L);
            return s;
        });
        when(shipmentHistoryRepository.save(any(ShipmentHistory.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateShipmentRequest req = CreateShipmentRequest.builder()
                .orderId(1L)
                .carrierCode("GHN")
                .shippingFee(BigDecimal.valueOf(30000))
                .codAmount(BigDecimal.valueOf(30000000))
                .hubLocation("Kho TP.HCM")
                .build();

        ShipmentDTO result = shipmentService.createShipment(req);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getStatus()).isEqualTo("READY_TO_SHIP");
        assertThat(result.getCarrierCode()).isEqualTo("GHN");
        assertThat(result.getTrackingNumber()).matches("^GP-\\d{8}-[A-Z0-9]{5}$");

        // Kiểm tra Order đã tự động đổi trạng thái sang SHIPPING
        assertThat(sampleOrder.getOrderStatus()).isEqualTo("SHIPPING");
        verify(orderRepository).save(sampleOrder);
        verify(shipmentHistoryRepository).save(any(ShipmentHistory.class));
    }

    @Test
    @DisplayName("Kịch bản Demo trọng tâm: Khi Shipment chuyển sang DELIVERED, Order tự chuyển sang COMPLETED và tự kích hoạt bảo hành 12 tháng")
    void testUpdateShipmentStatus_WhenDelivered_SetsOrderCompleted_And_ActivatesWarranty() {
        Shipment shipment = Shipment.builder()
                .order(sampleOrder)
                .trackingNumber("GHN-DELIVERY-01")
                .carrierCode("GHN")
                .status("DELIVERING")
                .build();
        shipment.setId(20L);

        when(shipmentRepository.findById(20L)).thenReturn(Optional.of(shipment));
        when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(warrantyRepository.findByOrderId(1L)).thenReturn(List.of()); // Chưa có bảo hành trước đó

        UpdateShipmentStatusRequest req = UpdateShipmentStatusRequest.builder()
                .status("DELIVERED")
                .hubLocation("Bưu cục giao hàng Quận 1")
                .shipperNote("Khách hàng đã nhận máy và thanh toán COD đầy đủ")
                .build();

        ShipmentDTO result = shipmentService.updateShipmentStatus(20L, req);

        assertThat(result.getStatus()).isEqualTo("DELIVERED");
        assertThat(shipment.getDeliveredAt()).isNotNull();

        // Kiểm tra Order tự động chuyển sang COMPLETED và thanh toán COD chuyển sang PAID
        assertThat(sampleOrder.getOrderStatus()).isEqualTo("COMPLETED");
        assertThat(sampleOrder.getPaymentStatus()).isEqualTo("PAID");
        verify(orderRepository).save(sampleOrder);

        // Kiểm tra tự động tạo bản ghi Warranty 12 tháng
        ArgumentCaptor<Warranty> warrantyCaptor = ArgumentCaptor.forClass(Warranty.class);
        verify(warrantyRepository, times(1)).save(warrantyCaptor.capture());

        Warranty createdWarranty = warrantyCaptor.getValue();
        assertThat(createdWarranty.getOrder().getId()).isEqualTo(1L);
        assertThat(createdWarranty.getPhoneVariant().getId()).isEqualTo(100L);
        assertThat(createdWarranty.getCustomerName()).isEqualTo("Trần Văn B");
        assertThat(createdWarranty.getCustomerPhone()).isEqualTo("0912345678");
        assertThat(createdWarranty.getImeiNumber()).hasSize(15); // Đúng chuẩn 15 chữ số IMEI
        assertThat(createdWarranty.getStatus()).isEqualTo("ACTIVE");
        assertThat(createdWarranty.getEndDate()).isAfterOrEqualTo(createdWarranty.getStartDate().plusMonths(12).minusDays(1));
    }

    @Test
    @DisplayName("Quy tắc bắt buộc: Từ chối tạo Shipment nếu CarrierCode không hợp lệ")
    void testCreateShipment_WithInvalidCarrierCode_ThrowsException() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        CreateShipmentRequest req = CreateShipmentRequest.builder()
                .orderId(1L)
                .carrierCode("UNKNOWN_CARRIER")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> shipmentService.createShipment(req));
        assertThat(ex.getMessage()).contains("Invalid carrier code");
        verify(shipmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kiểm tra sinh mã vận đơn tự động theo định dạng GP-YYYYMMDD-XXXXX")
    void testGenerateTrackingNumber_MatchesPattern() {
        when(shipmentRepository.existsByTrackingNumber(anyString())).thenReturn(false);
        String trackingNumber = shipmentService.generateTrackingNumber();
        assertThat(trackingNumber).matches("^GP-\\d{8}-[A-Z0-9]{5}$");
    }

    @Test
    @DisplayName("Kiểm tra thuật toán sinh IMEI tuân thủ chuẩn Luhn checksum")
    void testGenerateUniqueImei_ValidLuhn() {
        String imei = shipmentService.generateUniqueImei();
        assertThat(imei).hasSize(15);
        assertThat(imei).matches("^\\d{15}$");

        // Kiểm tra tính hợp lệ qua thuật toán Luhn
        int sum = 0;
        for (int i = 0; i < 15; i++) {
            int digit = Character.getNumericValue(imei.charAt(i));
            if (i % 2 == 1) { // Vị trí lẻ nhân 2
                digit *= 2;
                if (digit > 9) {
                    digit = (digit / 10) + (digit % 10);
                }
            }
            sum += digit;
        }
        assertThat(sum % 10).isEqualTo(0);
    }
}
