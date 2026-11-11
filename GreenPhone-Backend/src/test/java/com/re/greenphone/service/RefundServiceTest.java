package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.ConfirmRefundRequest;
import com.re.greenphone.dto.request.CreateRefundRequest;
import com.re.greenphone.dto.response.RefundDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.RefundMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.security.UserPrincipal;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private UserPromotionRepository userPromotionRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private InventoryStockHistoryService inventoryStockHistoryService;

    @Mock
    private RefundTransactionRepository refundTransactionRepository;

    @Mock
    private RefundMapper refundMapper;

    @Mock
    private EmailService emailService;

    @Mock
    private jakarta.persistence.EntityManager entityManager;

    @InjectMocks
    private RefundService refundService;

    private User customer;
    private Order order;
    private PhoneVariant variant;
    private Payment payment;

    @BeforeEach
    void setUp() {
        customer = new User();
        customer.setId(10L);
        customer.setFullName("Nguyễn Văn A");
        customer.setEmail("user@gmail.com");

        variant = PhoneVariant.builder()
                .stockQuantity(10)
                .price(new BigDecimal("20000000"))
                .build();
        variant.setId(100L);

        order = Order.builder()
                .user(customer)
                .orderStatus("CONFIRMED")
                .paymentStatus("PAID")
                .paymentMethod("BANKING")
                .finalAmount(new BigDecimal("20000000"))
                .totalAmount(new BigDecimal("20000000"))
                .orderDetails(new ArrayList<>())
                .build();
        order.setId(1L);

        OrderDetail detail = OrderDetail.builder()
                .order(order)
                .phoneVariant(variant)
                .quantity(2)
                .build();
        order.getOrderDetails().add(detail);

        payment = Payment.builder()
                .order(order)
                .amount(new BigDecimal("20000000"))
                .paidAt(LocalDateTime.now())
                .transactionCode("TX123456")
                .build();
        payment.setId(50L);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(longs = {0L, 42L})
    @DisplayName("Tạo yêu cầu refund thành công: chuyển sang CANCELLED, hoàn kho và lưu REQUESTED")
    void requestRefund_success(long warehouseId) {
        if (warehouseId != 0L) {
            order.getOrderDetails().get(0).setWarehouseId(warehouseId);
        }
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(10L);
            secMock.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.empty());
            when(paymentRepository.findByOrderIdOrderByIdAsc(1L)).thenReturn(List.of(payment));
            when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(variant));
            when(refundTransactionRepository.save(any(RefundTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(refundMapper.toDto(any(RefundTransaction.class)))
                    .thenReturn(RefundDTO.builder().orderId(1L).status("REQUESTED").build());

            CreateRefundRequest request = CreateRefundRequest.builder()
                    .reason("Đổi ý không mua nữa")
                    .bankName("MBBank")
                    .bankAccount("0987654321")
                    .accountHolder("NGUYEN VAN A")
                    .build();

            RefundDTO res = refundService.requestRefund(1L, request);

            assertThat(res).isNotNull();
            assertThat(res.getStatus()).isEqualTo("REQUESTED");
            assertThat(order.getOrderStatus()).isEqualTo("CANCELLED");
            assertThat(variant.getStockQuantity()).isEqualTo(12); // 10 + 2
            if (warehouseId == 0L) {
                verify(inventoryStockHistoryService).record(eq(variant), eq(10), eq(2), eq("IMPORT"), contains("Hoàn tiền"));
                verify(inventoryStockHistoryService, never()).recordAtWarehouse(any(), anyInt(), anyInt(), anyString(), anyString(), anyLong());
            } else {
                verify(inventoryStockHistoryService).recordAtWarehouse(eq(variant), eq(10), eq(2), eq("IMPORT"), contains("Hoàn tiền"), eq(warehouseId));
                verify(inventoryStockHistoryService, never()).record(any(), anyInt(), anyInt(), anyString(), anyString());
            }
            verify(refundTransactionRepository).save(any(RefundTransaction.class));
        }
    }

    @Test
    @DisplayName("Chống Double Refund: Bị từ chối nếu đơn đã có yêu cầu refund đang tồn tại")
    void requestRefund_alreadyExists_throwsBadRequest() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(10L);
            secMock.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(refundTransactionRepository.findByOrderId(1L))
                    .thenReturn(Optional.of(RefundTransaction.builder().status("REQUESTED").build()));

            CreateRefundRequest request = CreateRefundRequest.builder().reason("Lý do").build();

            assertThatThrownBy(() -> refundService.requestRefund(1L, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Đơn hàng này đã có yêu cầu hoàn tiền");
        }
    }

    @Test
    @DisplayName("Từ chối hoàn tiền nếu đơn hàng chưa thanh toán (UNPAID)")
    void requestRefund_unpaidOrder_throwsBadRequest() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(10L);
            secMock.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

            order.setPaymentStatus("UNPAID");
            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            CreateRefundRequest request = CreateRefundRequest.builder().reason("Lý do").build();

            assertThatThrownBy(() -> refundService.requestRefund(1L, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Chỉ đơn hàng đã thanh toán thành công");
        }
    }

    @Test
    @DisplayName("Chống IDOR: Khách không thể gửi refund cho đơn của người khác")
    void requestRefund_otherUserOrder_throwsBadRequest() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(999L);
            secMock.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            CreateRefundRequest request = CreateRefundRequest.builder().reason("Lý do").build();

            assertThatThrownBy(() -> refundService.requestRefund(1L, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bạn không có quyền yêu cầu hoàn tiền");
        }
    }

    @Test
    @DisplayName("Không cộng kho lần 2 nếu đơn hàng đã ở trạng thái CANCELLED từ trước")
    void requestRefund_alreadyCancelled_doesNotRestoreStockAgain() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(10L);
            secMock.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

            order.setOrderStatus("CANCELLED");
            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.empty());
            when(paymentRepository.findByOrderIdOrderByIdAsc(1L)).thenReturn(List.of(payment));
            when(refundTransactionRepository.save(any(RefundTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(refundMapper.toDto(any(RefundTransaction.class)))
                    .thenReturn(RefundDTO.builder().orderId(1L).status("REQUESTED").build());

            CreateRefundRequest request = CreateRefundRequest.builder().reason("Lý do").build();

            refundService.requestRefund(1L, request);

            // Kiểm tra: Tuyệt đối không gọi khóa PhoneVariant hay cộng kho
            verify(phoneVariantRepository, never()).findByIdWithLock(anyLong());
            verify(inventoryStockHistoryService, never()).record(any(), anyInt(), anyInt(), anyString(), anyString());
        }
    }

    @Test
    @DisplayName("Admin Claim hoàn tiền thành công chuyển trạng thái sang PROCESSING")
    void claimRefund_success() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(2L); // Admin ID = 2

            RefundTransaction refund = RefundTransaction.builder()
                    .order(order)
                    .status("REQUESTED")
                    .build();

            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.of(refund));
            when(refundTransactionRepository.claimRefund(1L, 2L)).thenReturn(1);
            when(refundMapper.toDto(any(RefundTransaction.class)))
                    .thenReturn(RefundDTO.builder().orderId(1L).status("PROCESSING").processedBy(2L).build());

            RefundDTO res = refundService.claimRefund(1L);

            assertThat(res).isNotNull();
            assertThat(res.getStatus()).isEqualTo("PROCESSING");
            assertThat(refund.getStatus()).isEqualTo("PROCESSING");
            assertThat(refund.getProcessedBy()).isEqualTo(2L);
        }
    }

    @Test
    @DisplayName("Admin Claim thất bại nếu yêu cầu đã được Admin khác nhận trước (Atomic update trả về 0)")
    void claimRefund_alreadyClaimed_throwsBadRequest() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(2L);

            RefundTransaction refund = RefundTransaction.builder()
                    .order(order)
                    .status("REQUESTED")
                    .build();

            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.of(refund));
            when(refundTransactionRepository.claimRefund(1L, 2L)).thenReturn(0);

            assertThatThrownBy(() -> refundService.claimRefund(1L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đã được Admin khác tiếp nhận");
        }
    }

    @Test
    @DisplayName("Admin Confirm hoàn tiền thành công: cập nhật Order & Payment thành REFUNDED")
    void confirmRefund_success() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(2L);

            RefundTransaction refund = RefundTransaction.builder()
                    .order(order)
                    .amount(new BigDecimal("20000000"))
                    .reason("Khách hủy đơn")
                    .status("PROCESSING")
                    .processedBy(2L)
                    .build();

            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.of(refund));
            when(refundMapper.toDto(any(RefundTransaction.class)))
                    .thenReturn(RefundDTO.builder().orderId(1L).status("COMPLETED").orderStatus("REFUNDED").paymentStatus("REFUNDED").build());

            ConfirmRefundRequest request = ConfirmRefundRequest.builder()
                    .transactionRef("FT2611099999")
                    .build();

            RefundDTO res = refundService.confirmRefund(1L, request);

            assertThat(res).isNotNull();
            assertThat(refund.getStatus()).isEqualTo("COMPLETED");
            assertThat(refund.getTransactionRef()).isEqualTo("FT2611099999");
            assertThat(order.getOrderStatus()).isEqualTo("REFUNDED");
            assertThat(order.getPaymentStatus()).isEqualTo("REFUNDED");
            verify(orderRepository).save(order);
            verify(refundTransactionRepository).save(refund);
        }
    }

    @Test
    @DisplayName("Admin Confirm thất bại nếu không phải Admin đã Claim")
    void confirmRefund_wrongAdmin_throwsBadRequest() {
        try (MockedStatic<SecurityUtils> secMock = mockStatic(SecurityUtils.class)) {
            secMock.when(SecurityUtils::getCurrentUserId).thenReturn(3L); // Admin 3

            RefundTransaction refund = RefundTransaction.builder()
                    .order(order)
                    .status("PROCESSING")
                    .processedBy(2L) // Do Admin 2 claim
                    .build();

            when(refundTransactionRepository.findByOrderId(1L)).thenReturn(Optional.of(refund));

            ConfirmRefundRequest request = ConfirmRefundRequest.builder().transactionRef("FT123").build();

            assertThatThrownBy(() -> refundService.confirmRefund(1L, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("đang được xử lý bởi Admin khác");
        }
    }
}

