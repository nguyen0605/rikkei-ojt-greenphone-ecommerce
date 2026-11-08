package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserPromotionRepository userPromotionRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private EmailService emailService;

    @Mock
    private InventoryStockHistoryService inventoryStockHistoryService;

    @InjectMocks
    private AdminOrderService adminOrderService;

    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        sampleOrder = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .totalAmount(new BigDecimal("20000000"))
                .finalAmount(new BigDecimal("20000000"))
                .orderDetails(new ArrayList<>())
                .build();
        sampleOrder.setId(1L);
    }

    @Test
    @DisplayName("Demo Postman: Cố tình chuyển DELIVERED sang PENDING phải ném 400 Bad Request kèm thông báo chính xác")
    void testDeliveredToPendingThrowsBadRequestException() {
        sampleOrder.setOrderStatus("DELIVERED");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "PENDING"));

        assertEquals("Không thể chuyển trạng thái từ DELIVERED sang PENDING", ex.getMessage());
        verify(orderRepository, never()).save(any());
        verify(phoneVariantRepository, never()).save(any());
        verify(inventoryStockHistoryService, never()).record(any(), anyInt(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("Đơn đã CANCELLED bị khóa vĩnh viễn, không thể chuyển sang bất kỳ trạng thái nào")
    void testCancelledToAnyThrowsBadRequestException() {
        sampleOrder.setOrderStatus("CANCELLED");
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "PENDING"));
        assertEquals("Không thể chuyển trạng thái từ CANCELLED sang PENDING", ex1.getMessage());

        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "CONFIRMED"));
        assertEquals("Không thể chuyển trạng thái từ CANCELLED sang CONFIRMED", ex2.getMessage());

        BadRequestException ex3 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "CANCELLED"));
        assertEquals("Không thể chuyển trạng thái từ CANCELLED sang CANCELLED", ex3.getMessage());

        verify(orderRepository, never()).save(any());
        verify(phoneVariantRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn các bước nhảy trạng thái trái quy tắc (PENDING -> SHIPPING, CONFIRMED -> DELIVERED, etc.)")
    void testInvalidTransitionsBlocked() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        // PENDING -> SHIPPING
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "SHIPPING"));
        assertEquals("Không thể chuyển trạng thái từ PENDING sang SHIPPING", ex1.getMessage());

        // PENDING -> DELIVERED
        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "DELIVERED"));
        assertEquals("Không thể chuyển trạng thái từ PENDING sang DELIVERED", ex2.getMessage());

        // CONFIRMED -> DELIVERED
        sampleOrder.setOrderStatus("CONFIRMED");
        BadRequestException ex3 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "DELIVERED"));
        assertEquals("Không thể chuyển trạng thái từ CONFIRMED sang DELIVERED", ex3.getMessage());

        // PROCESSING -> DELIVERED
        sampleOrder.setOrderStatus("PROCESSING");
        BadRequestException ex4 = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "DELIVERED"));
        assertEquals("Không thể chuyển trạng thái từ PROCESSING sang DELIVERED", ex4.getMessage());
    }

    @Test
    @DisplayName("Ném BadRequestException khi truyền trạng thái không hợp lệ")
    void testInvalidStatusStringThrowsBadRequestException() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "UNKNOWN_STATUS"));
        assertEquals("Trạng thái đơn hàng không hợp lệ: UNKNOWN_STATUS", ex.getMessage());
    }

    @Test
    @DisplayName("Luồng hợp lệ từng bước: PENDING -> CONFIRMED -> PROCESSING -> SHIPPING -> DELIVERED")
    void testValidHappyPath() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        // 1. PENDING -> CONFIRMED
        adminOrderService.updateStatus(1L, "CONFIRMED");
        assertEquals("CONFIRMED", sampleOrder.getOrderStatus());

        // 2. CONFIRMED -> PROCESSING
        adminOrderService.updateStatus(1L, "PROCESSING");
        assertEquals("PROCESSING", sampleOrder.getOrderStatus());

        // 3. PROCESSING -> SHIPPING
        adminOrderService.updateStatus(1L, "SHIPPING");
        assertEquals("SHIPPING", sampleOrder.getOrderStatus());

        // 4. SHIPPING -> DELIVERED
        adminOrderService.updateStatus(1L, "DELIVERED");
        assertEquals("DELIVERED", sampleOrder.getOrderStatus());
    }

    @Test
    @DisplayName("Hủy đơn tự động hoàn trả số lượng tồn kho bằng lock bi quan và khôi phục voucher, hoàn tiền")
    void testCancelOrderRestoresStockAndVoucherAndRefunds() {
        PhoneVariant variant = PhoneVariant.builder()
                .stockQuantity(10)
                .build();
        variant.setId(100L);

        OrderDetail detail = OrderDetail.builder()
                .order(sampleOrder)
                .phoneVariant(variant)
                .quantity(3)
                .unitPrice(new BigDecimal("5000000"))
                .build();
        sampleOrder.setOrderDetails(List.of(detail));

        UserPromotion userPromotion = UserPromotion.builder()
                .status("USED")
                .build();
        sampleOrder.setUserPromotion(userPromotion);
        sampleOrder.setPaymentStatus("PAID");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        adminOrderService.updateStatus(1L, "CANCELLED", "Hết hàng trong kho");

        // Kiểm tra tồn kho được cộng hoàn lại: 10 + 3 = 13
        assertEquals(13, variant.getStockQuantity());
        verify(inventoryStockHistoryService).record(eq(variant), eq(10), eq(3), eq("IMPORT"), eq("Admin hủy đơn hàng"));
        verify(phoneVariantRepository).save(variant);

        // Kiểm tra voucher được khôi phục AVAILABLE
        assertEquals("AVAILABLE", userPromotion.getStatus());
        assertNull(userPromotion.getUsedAt());
        verify(userPromotionRepository).save(userPromotion);

        // Kiểm tra trạng thái thanh toán chuyển thành REFUNDED
        assertEquals("REFUNDED", sampleOrder.getPaymentStatus());
        assertEquals("CANCELLED", sampleOrder.getOrderStatus());
        assertTrue(sampleOrder.getNote().contains("[Lý do hủy: Hết hàng trong kho]"));
    }

    @Test
    @DisplayName("Không bao giờ hoàn tồn kho hai lần do CANCELLED là trạng thái kết thúc khóa vĩnh viễn")
    void testCannotCancelTwiceNoDoubleRestore() {
        PhoneVariant variant = PhoneVariant.builder()
                .stockQuantity(10)
                .build();
        variant.setId(100L);

        OrderDetail detail = OrderDetail.builder()
                .order(sampleOrder)
                .phoneVariant(variant)
                .quantity(2)
                .unitPrice(new BigDecimal("5000000"))
                .build();
        sampleOrder.setOrderDetails(List.of(detail));

        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        // Lần hủy thứ nhất: thành công và hoàn kho
        adminOrderService.updateStatus(1L, "CANCELLED");
        assertEquals(12, variant.getStockQuantity());
        verify(inventoryStockHistoryService, times(1)).record(any(), anyInt(), anyInt(), anyString(), anyString());
        verify(phoneVariantRepository, times(1)).save(variant);

        // Lần hủy thứ hai: bị chặn ngay bởi máy trạng thái
        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminOrderService.updateStatus(1L, "CANCELLED"));
        assertEquals("Không thể chuyển trạng thái từ CANCELLED sang CANCELLED", ex.getMessage());

        // Số lượng tồn kho vẫn là 12, không bị cộng thêm lần nữa
        assertEquals(12, variant.getStockQuantity());
        verify(inventoryStockHistoryService, times(1)).record(any(), anyInt(), anyInt(), anyString(), anyString());
        verify(phoneVariantRepository, times(1)).save(variant);
    }
}

