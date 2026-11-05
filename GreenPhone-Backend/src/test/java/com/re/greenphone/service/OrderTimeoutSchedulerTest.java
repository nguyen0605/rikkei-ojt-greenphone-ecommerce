package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderTimeoutSchedulerTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @InjectMocks
    private OrderTimeoutScheduler orderTimeoutScheduler;

    @Test
    @DisplayName("Case 1: Quá hạn 15 phút - Hủy đơn VietQR/Sepay và hoàn trả tồn kho đúng số lượng")
    void cancelExpiredPendingOrders_ShouldCancelAndRestoreStock() {
        ReflectionTestUtils.setField(orderTimeoutScheduler, "timeoutMinutes", 15);

        PhoneVariant variant = PhoneVariant.builder()
                .price(new BigDecimal("10000000"))
                .stockQuantity(8)
                .build();
        variant.setId(100L);

        Order order = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("VIETQR")
                .orderDetails(new ArrayList<>())
                .build();
        order.setId(1L);

        OrderDetail detail = OrderDetail.builder()
                .order(order)
                .phoneVariant(variant)
                .quantity(2)
                .build();
        order.getOrderDetails().add(detail);

        when(orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                eq("PENDING"), eq("UNPAID"), eq(List.of("VIETQR", "SEPAY")), any(LocalDateTime.class)))
                .thenReturn(List.of(order));

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(variant));
        when(phoneVariantRepository.save(any(PhoneVariant.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderTimeoutScheduler.cancelExpiredPendingOrders();

        assertEquals("CANCELLED", order.getOrderStatus());
        assertEquals("UNPAID", order.getPaymentStatus());
        assertEquals("Quá hạn thanh toán 15 phút", order.getNote());
        assertEquals(10, variant.getStockQuantity()); // 8 + 2

        verify(phoneVariantRepository).save(variant);
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Case 2: Đơn đã thanh toán (PAID) - Không bao giờ bị hủy")
    void cancelExpiredPendingOrders_WhenPaid_ShouldNotCancel() {
        ReflectionTestUtils.setField(orderTimeoutScheduler, "timeoutMinutes", 15);

        Order paidOrder = Order.builder()
                .orderStatus("CONFIRMED")
                .paymentStatus("PAID")
                .paymentMethod("VIETQR")
                .build();
        paidOrder.setId(10L);

        // Giả sử query ban đầu thấy order nhưng khi vào cancelOne đọc fresh thì đã được webhook thanh toán thành PAID
        Order staleOrder = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("VIETQR")
                .build();
        staleOrder.setId(10L);

        when(orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                eq("PENDING"), eq("UNPAID"), eq(List.of("VIETQR", "SEPAY")), any(LocalDateTime.class)))
                .thenReturn(List.of(staleOrder));

        when(orderRepository.findById(10L)).thenReturn(Optional.of(paidOrder));

        orderTimeoutScheduler.cancelExpiredPendingOrders();

        // Không lưu hoặc hủy order đã PAID
        verify(orderRepository, never()).save(paidOrder);
        verify(phoneVariantRepository, never()).save(any());
    }

    @Test
    @DisplayName("Case 3: Đơn thanh toán khi nhận hàng (COD) - Tuyệt đối không hủy")
    void cancelExpiredPendingOrders_CODOrder_ShouldNotCancel() {
        ReflectionTestUtils.setField(orderTimeoutScheduler, "timeoutMinutes", 15);

        Order codOrder = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("COD")
                .build();
        codOrder.setId(20L);

        when(orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                eq("PENDING"), eq("UNPAID"), eq(List.of("VIETQR", "SEPAY")), any(LocalDateTime.class)))
                .thenReturn(List.of(codOrder));

        when(orderRepository.findById(20L)).thenReturn(Optional.of(codOrder));

        orderTimeoutScheduler.cancelExpiredPendingOrders();

        verify(orderRepository, never()).save(codOrder);
        verify(phoneVariantRepository, never()).save(any());
    }

    @Test
    @DisplayName("Case 4: Xung đột OptimisticLockException - Không crash tiến trình, bỏ qua để round sau xử lý")
    void cancelExpiredPendingOrders_ConcurrentModification_ShouldCatchAndNotThrow() {
        ReflectionTestUtils.setField(orderTimeoutScheduler, "timeoutMinutes", 15);

        Order order = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("SEPAY")
                .build();
        order.setId(30L);

        when(orderRepository.findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
                eq("PENDING"), eq("UNPAID"), eq(List.of("VIETQR", "SEPAY")), any(LocalDateTime.class)))
                .thenReturn(List.of(order));

        when(orderRepository.findById(30L)).thenThrow(new OptimisticLockException("Row modified concurrently"));

        // Phải không bị ném exception ra ngoài làm chết Scheduler
        orderTimeoutScheduler.cancelExpiredPendingOrders();

        verify(orderRepository).findById(30L);
    }
}
