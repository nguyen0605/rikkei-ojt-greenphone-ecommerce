package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Promotion;
import com.re.greenphone.entity.UserPromotion;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.PromotionRepository;
import com.re.greenphone.repository.UserPromotionRepository;
import com.re.greenphone.service.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private UserPromotionRepository userPromotionRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private EmailService emailService;

    @Mock
    private InventoryStockHistoryService inventoryStockHistoryService;

    @InjectMocks
    private AdminOrderService adminOrderService;

    @Test
    @DisplayName("Admin hủy đơn: Gỡ khóa ngoại userPromotion khỏi đơn hàng và hoàn voucher")
    void updateStatus_cancelOrder_releasesUserPromotionAndRestoresVoucher() {
        Promotion promo = Promotion.builder()
                .code("TESTVOUCHER")
                .status("ACTIVE")
                .usedQuantity(1)
                .endDate(LocalDateTime.now().plusDays(5))
                .build();

        UserPromotion up = UserPromotion.builder()
                .promotion(promo)
                .status("USED")
                .usedAt(LocalDateTime.now())
                .build();
        up.setId(10L);

        Order order = Order.builder()
                .orderStatus("CONFIRMED")
                .paymentStatus("PAID")
                .userPromotion(up)
                .orderDetails(new ArrayList<>())
                .build();
        order.setId(1L);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any(Order.class))).thenReturn(OrderDTO.builder().id(1L).build());

        adminOrderService.updateStatus(1L, "CANCELLED", "Khách đổi ý");

        // Ràng buộc quan trọng: userPromotion trên đơn phải bị set null để gỡ khóa UNIQUE
        assertNull(order.getUserPromotion());
        assertThat(order.getOrderStatus()).isEqualTo("CANCELLED");
        assertThat(order.getPaymentStatus()).isEqualTo("REFUND_PENDING");

        assertThat(up.getStatus()).isEqualTo("AVAILABLE");
        assertNull(up.getUsedAt());
        verify(userPromotionRepository).save(up);

        assertThat(promo.getUsedQuantity()).isEqualTo(0);
        verify(promotionRepository).save(promo);
    }

    @Test
    @DisplayName("Order State Machine: Chặn chuyển đổi trạng thái không hợp lệ (Ví dụ: PENDING -> DELIVERED)")
    void updateStatus_invalidTransition_throwsBadRequest() {
        Order order = Order.builder().orderStatus("PENDING").build();
        order.setId(2L);

        when(orderRepository.findById(2L)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> adminOrderService.updateStatus(2L, "DELIVERED"));
    }

    @Test
    @DisplayName("Order State Machine: Chặn chuyển đổi khi đơn đã ở Terminal State (DELIVERED)")
    void updateStatus_terminalStateDelivered_throwsBadRequest() {
        Order order = Order.builder().orderStatus("DELIVERED").build();
        order.setId(3L);

        when(orderRepository.findById(3L)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> adminOrderService.updateStatus(3L, "CANCELLED"));
    }

    @Test
    @DisplayName("Cập nhật PaymentStatus sang REFUNDED thành công và ghi chú nhật ký đối soát")
    void updatePaymentStatus_refunded_success() {
        Order order = Order.builder()
                .orderStatus("CANCELLED")
                .paymentStatus("REFUND_PENDING")
                .build();
        order.setId(4L);

        when(orderRepository.findById(4L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any(Order.class))).thenReturn(OrderDTO.builder().id(4L).build());

        adminOrderService.updatePaymentStatus(4L, "REFUNDED");

        assertThat(order.getPaymentStatus()).isEqualTo("REFUNDED");
        assertThat(order.getNote()).contains("[Kế toán đã hoàn tiền thành công lúc");
    }
}

