package com.re.greenphone.repository;

import com.re.greenphone.config.BaseIntegrationTest;
import com.re.greenphone.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("ShipmentRepository Integration Tests")
class ShipmentRepositoryTest extends BaseIntegrationTest {

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private ShipmentHistoryRepository shipmentHistoryRepository;

    private Order createTestOrder(String orderStatus) {
        setupBaseData();

        Order order = Order.builder()
                .user(customerA)
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("123 Đường Cầu Giấy, Hà Nội")
                .totalAmount(BigDecimal.valueOf(25000000))
                .finalAmount(BigDecimal.valueOf(25000000))
                .orderStatus(orderStatus)
                .paymentStatus("PAID")
                .paymentMethod("VIETQR")
                .build();
        em.persist(order);
        em.flush();
        return order;
    }

    @Test
    @DisplayName("Lưu kiện hàng Shipment thành công và liên kết chính xác với Order")
    void testSaveShipment_Success() {
        Order order = createTestOrder("PROCESSING");

        Shipment shipment = Shipment.builder()
                .order(order)
                .trackingNumber("GHN-HN-00123")
                .carrierCode("GHN")
                .shippingFee(BigDecimal.valueOf(35000))
                .codAmount(BigDecimal.ZERO)
                .status("READY_TO_SHIP")
                .estimatedDeliveryAt(LocalDateTime.now().plusDays(2))
                .note("Giao giờ hành chính")
                .build();

        Shipment saved = shipmentRepository.save(shipment);
        em.flush();
        em.clear();

        assertThat(saved.getId()).isNotNull();

        Optional<Shipment> found = shipmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTrackingNumber()).isEqualTo("GHN-HN-00123");
        assertThat(found.get().getCarrierCode()).isEqualTo("GHN");
        assertThat(found.get().getOrder().getId()).isEqualTo(order.getId());
        assertThat(found.get().getStatus()).isEqualTo("READY_TO_SHIP");
    }

    @Test
    @DisplayName("Ràng buộc duy nhất (UNIQUE) trên cột tracking_number: báo lỗi khi trùng mã")
    void testUniqueTrackingNumber_ThrowsException() {
        Order order = createTestOrder("PROCESSING");

        Shipment shipment1 = Shipment.builder()
                .order(order)
                .trackingNumber("GHTK-UNIQUE-999")
                .carrierCode("GHTK")
                .shippingFee(BigDecimal.valueOf(30000))
                .codAmount(BigDecimal.ZERO)
                .status("READY_TO_SHIP")
                .build();
        shipmentRepository.save(shipment1);
        em.flush();

        Shipment shipment2 = Shipment.builder()
                .order(order)
                .trackingNumber("GHTK-UNIQUE-999") // Trùng mã vận đơn
                .carrierCode("VIETTEL_POST")
                .shippingFee(BigDecimal.valueOf(30000))
                .codAmount(BigDecimal.ZERO)
                .status("READY_TO_SHIP")
                .build();

        assertThrows(DataIntegrityViolationException.class, () -> {
            shipmentRepository.save(shipment2);
            em.flush();
        });
    }

    @Test
    @DisplayName("Truy vấn kiện hàng theo mã tracking_number và order_id")
    void testFindByTrackingNumberAndOrderId() {
        Order order = createTestOrder("PROCESSING");

        Shipment shipment = Shipment.builder()
                .order(order)
                .trackingNumber("VTP-TEST-8888")
                .carrierCode("VIETTEL_POST")
                .shippingFee(BigDecimal.valueOf(25000))
                .codAmount(BigDecimal.valueOf(500000))
                .status("DELIVERING")
                .build();
        shipmentRepository.save(shipment);

        ShipmentHistory history1 = ShipmentHistory.builder()
                .shipment(shipment)
                .status("READY_TO_SHIP")
                .hubLocation("Kho Tổng Hà Nội")
                .shipperNote("Đã nhận hàng từ kho")
                .build();
        shipmentHistoryRepository.save(history1);

        ShipmentHistory history2 = ShipmentHistory.builder()
                .shipment(shipment)
                .status("DELIVERING")
                .hubLocation("Bưu cục Cầu Giấy")
                .shipperNote("Đang trên đường giao tới người nhận")
                .build();
        shipmentHistoryRepository.save(history2);
        em.flush();
        em.clear();

        Optional<Shipment> foundByTracking = shipmentRepository.findByTrackingNumber("VTP-TEST-8888");
        assertThat(foundByTracking).isPresent();
        assertThat(foundByTracking.get().getStatus()).isEqualTo("DELIVERING");

        List<Shipment> foundByOrder = shipmentRepository.findByOrderId(order.getId());
        assertThat(foundByOrder).hasSize(1);
        assertThat(foundByOrder.get(0).getTrackingNumber()).isEqualTo("VTP-TEST-8888");

        List<ShipmentHistory> histories = shipmentHistoryRepository.findByShipmentIdOrderByCreatedAtDesc(shipment.getId());
        assertThat(histories).hasSize(2);
    }
}
