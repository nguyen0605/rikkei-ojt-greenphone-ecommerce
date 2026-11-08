package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderTimeoutSchedulerTest {
    @Mock private OrderRepository orderRepository;
    @Mock private PhoneVariantRepository phoneVariantRepository;
    @Mock private InventoryStockHistoryService historyService;
    @Mock private EntityManager entityManager;
    @InjectMocks private OrderTimeoutScheduler scheduler;

    @Test
    void restoresStockAndAuditsUsingLockedVariant() {
        PhoneVariant stale = PhoneVariant.builder().stockQuantity(10).build();
        stale.setId(2L);
        PhoneVariant locked = PhoneVariant.builder().stockQuantity(6).build();
        locked.setId(2L);
        Order order = Order.builder().orderStatus("PENDING").paymentStatus("UNPAID").build();
        order.setId(1L);
        order.setOrderDetails(List.of(OrderDetail.builder().phoneVariant(stale).quantity(2).build()));
        when(orderRepository.findByOrderStatusAndPaymentStatusAndCreatedAtBefore(eq("PENDING"), eq("UNPAID"), any()))
                .thenReturn(List.of(order));
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(phoneVariantRepository.findByIdWithLock(2L)).thenReturn(Optional.of(locked));

        scheduler.cancelExpiredPendingOrders();

        assertThat(locked.getStockQuantity()).isEqualTo(8);
        assertThat(stale.getStockQuantity()).isEqualTo(10);
        var inOrder = inOrder(phoneVariantRepository, entityManager, historyService);
        inOrder.verify(phoneVariantRepository).findByIdWithLock(2L);
        inOrder.verify(entityManager).refresh(locked, LockModeType.PESSIMISTIC_WRITE);
        inOrder.verify(historyService).record(eq(locked), eq(6), eq(2), eq("IMPORT"), anyString());
        inOrder.verify(phoneVariantRepository).save(locked);
        assertThat(order.getOrderStatus()).isEqualTo("CANCELLED");
        verify(orderRepository).save(order);
    }

    @Test
    void skipsOrdersThatAreAlreadyPaid() {
        Order order = Order.builder().orderStatus("PENDING").paymentStatus("PAID").build();
        order.setId(1L);
        when(orderRepository.findByOrderStatusAndPaymentStatusAndCreatedAtBefore(eq("PENDING"), eq("UNPAID"), any()))
                .thenReturn(List.of(order));
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        scheduler.cancelExpiredPendingOrders();

        verifyNoInteractions(phoneVariantRepository, historyService);
        verify(orderRepository, never()).save(any());
    }
}
