package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.PaymentDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.PaymentMapper;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import com.re.greenphone.security.SecurityUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentMapper paymentMapper;
    @Mock private SepayService sepayService;

    @InjectMocks
    private PaymentService paymentService;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private Order testOrder;
    private Payment testPayment;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);

        testOrder = Order.builder()
                .user(user)
                .totalAmount(new BigDecimal("25000000"))
                .finalAmount(new BigDecimal("24000000"))
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("COD")
                .build();
        testOrder.setId(1L);

        testPayment = Payment.builder()
                .order(testOrder)
                .amount(new BigDecimal("24000000"))
                .build();
        testPayment.setId(100L);

        securityUtilsMock = mockStatic(SecurityUtils.class);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
    }

    @Test
    void createPayment_Success() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderId(1L)).thenReturn(List.of());
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);

        PaymentDTO dto = new PaymentDTO();
        dto.setId(100L);
        dto.setAmount(new BigDecimal("24000000"));
        when(paymentMapper.toDto(testPayment)).thenReturn(dto);

        PaymentDTO result = paymentService.createPayment(1L, "VIETQR");

        assertThat(result.getId()).isEqualTo(100L);
        
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void createPayment_UsesFinalAmount() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderId(1L)).thenReturn(List.of());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            // Verify payment uses finalAmount, not totalAmount
            assertThat(p.getAmount()).isEqualByComparingTo(new BigDecimal("24000000"));
            return p;
        });
        when(paymentMapper.toDto(any())).thenReturn(new PaymentDTO());

        paymentService.createPayment(1L, "VIETQR");

        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void createPayment_OrderNotFound() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPayment(999L, "VIETQR"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createPayment_NotOwner_Rejected() {
        User other = new User();
        other.setId(99L);
        testOrder.setUser(other);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        assertThatThrownBy(() -> paymentService.createPayment(1L, "VIETQR"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createPayment_DedupsExistingPending() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderId(1L)).thenReturn(List.of(testPayment));
        when(paymentMapper.toDto(testPayment)).thenReturn(new PaymentDTO());

        paymentService.createPayment(1L, "VIETQR");

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void getPayment_Success() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderIdOrderByIdAsc(1L)).thenReturn(List.of(testPayment));
        when(paymentMapper.toDto(testPayment)).thenReturn(new PaymentDTO());

        PaymentDTO result = paymentService.getPayment(1L);

        assertThat(result).isNotNull();
    }

    @Test
    void getPayment_NoPaymentFound() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderIdOrderByIdAsc(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> paymentService.getPayment(1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getPayment_NotOwner_Rejected() {
        User other = new User();
        other.setId(99L);
        testOrder.setUser(other);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        assertThatThrownBy(() -> paymentService.getPayment(1L))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getQRCode_DelegatesToSepayService() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(sepayService.generateQRUrl(24000000L, "GREENPHONE1"))
                .thenReturn("https://vietqr.app/img?acc=test&bank=VCB&amount=24000000&des=GREENPHONE1&template=compact");

        com.re.greenphone.dto.response.PaymentQRDTO qr = paymentService.getQRCode(1L);

        assertThat(qr.getQrUrl()).contains("vietqr.app");
        verify(sepayService).generateQRUrl(24000000L, "GREENPHONE1");
    }

    @Test
    void getQRCode_RoundsAmountToLong() {
        // Test with decimal finalAmount
        testOrder.setFinalAmount(new BigDecimal("24000000.99"));

        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(sepayService.generateQRUrl(24000001L, "GREENPHONE1")).thenReturn("test-url");

        paymentService.getQRCode(1L);

        // Round half-up to 24000001 (was truncate-to-24000000 before)
        verify(sepayService).generateQRUrl(24000001L, "GREENPHONE1");
    }
}
