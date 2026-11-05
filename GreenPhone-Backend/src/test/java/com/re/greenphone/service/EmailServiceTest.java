package com.re.greenphone.service;

import com.re.greenphone.config.MailConfig;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.repository.OrderRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private OrderRepository orderRepository;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender, orderRepository);
        lenient().when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    @DisplayName("sendOTP: should construct and send OTP email")
    void sendOTP_success() throws Exception {
        emailService.sendOTP("customer@example.com", "123456");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getAllRecipients()[0].toString()).isEqualTo("customer@example.com");
        assertThat(sentMessage.getSubject()).isEqualTo("Mã xác thực OTP - GreenPhone");
    }

    @Test
    @DisplayName("sendOrderConfirmation: should render detailed invoice when Order exists")
    void sendOrderConfirmation_withFullOrder() throws Exception {
        Long orderId = 99L;
        Order order = Order.builder()
                .receiverName("Nguyễn Văn A")
                .receiverPhone("0987654321")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .paymentMethod("COD")
                .paymentStatus("UNPAID")
                .totalAmount(new BigDecimal("25000000"))
                .discountAmount(new BigDecimal("500000"))
                .finalAmount(new BigDecimal("24500000"))
                .build();
        order.setId(orderId);
        order.setCreatedAt(LocalDateTime.now());

        OrderDetail detail = OrderDetail.builder()
                .productName("iPhone 15 Pro")
                .ram("8GB")
                .storage("256GB")
                .color("Titan Tự Nhiên")
                .quantity(1)
                .unitPrice(new BigDecimal("25000000"))
                .subtotal(new BigDecimal("25000000"))
                .build();
        order.setOrderDetails(List.of(detail));

        when(orderRepository.findByIdWithDetails(orderId)).thenReturn(Optional.of(order));

        emailService.sendOrderConfirmation("customer@example.com", "99");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getSubject()).contains("Hóa đơn xác nhận đơn hàng #99");
    }

    @Test
    @DisplayName("sendOrderConfirmation: fallback when order not found in database")
    void sendOrderConfirmation_fallbackWhenNotFound() throws Exception {
        when(orderRepository.findByIdWithDetails(100L)).thenReturn(Optional.empty());

        emailService.sendOrderConfirmation("customer@example.com", "100");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getSubject()).contains("Hóa đơn xác nhận đơn hàng #100");
    }

    @Test
    @DisplayName("sendWelcome: should construct and send welcome email")
    void sendWelcome_success() throws Exception {
        emailService.sendWelcome("newuser@example.com", "Nguyễn Văn B");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getSubject()).contains("Chào mừng đến với GreenPhone!");
    }

    @Test
    @DisplayName("sendOrderDelivered: should send delivery success email with product list")
    void sendOrderDelivered_success() throws Exception {
        emailService.sendOrderDelivered("customer@example.com", "88", "Nguyễn Văn C", List.of("iPhone 15", "Ốp lưng MagSafe"));

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getSubject()).contains("đã giao thành công");
    }

    @Test
    @DisplayName("MailConfig: should configure ThreadPoolTaskExecutor with mail-executor- prefix")
    void mailConfig_threadPoolTaskExecutor() {
        MailConfig mailConfig = new MailConfig();
        Executor executor = mailConfig.mailTaskExecutor();

        assertThat(executor).isInstanceOf(ThreadPoolTaskExecutor.class);
        ThreadPoolTaskExecutor poolExecutor = (ThreadPoolTaskExecutor) executor;
        assertThat(poolExecutor.getThreadNamePrefix()).isEqualTo("mail-executor-");
        assertThat(poolExecutor.getCorePoolSize()).isEqualTo(2);
        assertThat(poolExecutor.getMaxPoolSize()).isEqualTo(5);
        poolExecutor.shutdown();
    }
}
