package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.entity.User;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SepayServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private EmailService emailService;

    @InjectMocks
    private SepayService sepayService;

    private Order testOrder;
    private Payment testPayment;

    @BeforeEach
    void setUp() {
        testOrder = Order.builder()
                .orderStatus("PENDING")
                .paymentStatus("UNPAID")
                .paymentMethod("VIETQR")
                .totalAmount(new BigDecimal("25000000"))
                .finalAmount(new BigDecimal("24000000"))
                .build();
        testOrder.setId(100L);
        User testUser = new User();
        testUser.setEmail("test@test.com");
        testOrder.setUser(testUser);

        testPayment = Payment.builder()
                .order(testOrder)
                .amount(new BigDecimal("24000000"))
                .build();
        testPayment.setId(200L);
    }

    // === QR URL Tests ===

    @Test
    void generateQRUrl_ContainsAllParams() {
        String url = sepayService.generateQRUrl(24000000L, "GREENPHONE100");

        assertThat(url).contains("acc=");
        assertThat(url).contains("bank=");
        assertThat(url).contains("amount=24000000");
        assertThat(url).contains("template=compact");
        assertThat(url).contains("store=");
    }

    // === Signature Verification ===

    @Test
    void verifyWebhookSignature_NullSignature_Fails() {
        assertThat(sepayService.verifyWebhookSignature("{}", null, null)).isFalse();
    }

    @Test
    void verifyWebhookSignature_NullPayload_Fails() {
        assertThat(sepayService.verifyWebhookSignature(null, "sha256=abc", "1")).isFalse();
    }

    @Test
    void verifyWebhookSignature_NoPrefix_Fails() {
        assertThat(sepayService.verifyWebhookSignature("{}", "invalid", null)).isFalse();
    }

    @Test
    void verifyWebhookSignature_ApikeyFormat_ValidatesAgainstToken() {
        // The .env file may pre-load SEPA_API_TOKEN into system properties via Dotenv.
        // We test the actual Apikey parsing regardless of the exact token value.
        // Wrong API token should be rejected:
        assertThat(sepayService.verifyWebhookSignature("{}", "Apikey clearly-wrong-token-xyz-12345", null)).isFalse();
    }

    @Test
    void verifyWebhookSignature_HmacSha256_ValidSignature_Passes() throws Exception {
        System.setProperty("SEPAY_WEBHOOK_SECRET", "test-secret-key");
        String body = "{\"id\":\"tx123\",\"transferAmount\":24000000,\"content\":\"GREENPHONE100\"}";
        long now = System.currentTimeMillis() / 1000;
        String sig = "sha256=" + hmacSha256Hex(now + "." + body, "test-secret-key");
        assertThat(sepayService.verifyWebhookSignature(body, sig, String.valueOf(now))).isTrue();
    }

    @Test
    void verifyWebhookSignature_HmacSha256_WrongSecret_Fails() throws Exception {
        System.setProperty("SEPAY_WEBHOOK_SECRET", "test-secret-key");
        String body = "{\"id\":\"tx123\"}";
        long now = System.currentTimeMillis() / 1000;
        String sig = "sha256=" + hmacSha256Hex(now + "." + body, "wrong-secret");
        assertThat(sepayService.verifyWebhookSignature(body, sig, String.valueOf(now))).isFalse();
    }

    @Test
    void verifyWebhookSignature_HmacSha256_MissingTimestamp_Fails() throws Exception {
        System.setProperty("SEPAY_WEBHOOK_SECRET", "test-secret-key");
        String body = "{\"id\":\"tx123\"}";
        long now = System.currentTimeMillis() / 1000;
        String sig = "sha256=" + hmacSha256Hex(now + "." + body, "test-secret-key");
        assertThat(sepayService.verifyWebhookSignature(body, sig, null)).isFalse();
    }

    @Test
    void verifyWebhookSignature_HmacSha256_OldTimestamp_Fails() throws Exception {
        System.setProperty("SEPAY_WEBHOOK_SECRET", "test-secret-key");
        String body = "{\"id\":\"tx123\"}";
        long oldTs = System.currentTimeMillis() / 1000 - 600; // 10 minutes ago
        String sig = "sha256=" + hmacSha256Hex(oldTs + "." + body, "test-secret-key");
        assertThat(sepayService.verifyWebhookSignature(body, sig, String.valueOf(oldTs))).isFalse();
    }

    private static String hmacSha256Hex(String data, String secret) throws Exception {
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(
                secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        return java.util.HexFormat.of().formatHex(
                mac.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }

    // === Parse Tests ===

    @Test
    void parseWebhookPayload_ValidJson() {
        String raw = "{\"id\":\"tx123\",\"transferAmount\":24000000,\"content\":\"GREENPHONE100\"}";
        Map<String, Object> result = sepayService.parseWebhookPayload(raw);
        assertThat(result).containsEntry("id", "tx123");
        assertThat(result.get("transferAmount")).isEqualTo(24000000);
    }

    @Test
    void parseWebhookPayload_InvalidJson_ReturnsEmpty() {
        assertThat(sepayService.parseWebhookPayload("not json")).isEmpty();
    }

    // === Process Webhook Tests ===

    @Test
    void processWebhook_Success() {
        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());
        when(paymentRepository.findByOrderIdOrderByIdAsc(100L)).thenReturn(List.of(testPayment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);
        when(orderRepository.save(any(Order.class))).thenReturn(testOrder);

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", true);
        assertThat(result).containsEntry("orderId", 100L);
        assertThat(testPayment.getTransactionCode()).isEqualTo("tx123");
        assertThat(testOrder.getPaymentStatus()).isEqualTo("PAID");
        assertThat(testOrder.getOrderStatus()).isEqualTo("CONFIRMED");
        // Confirmation email sent only after payment is confirmed
        verify(emailService).sendOrderConfirmation(eq("test@test.com"), eq("100"));
    }

    @Test
    void processWebhook_Idempotent_DuplicateIgnored() {
        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        Payment alreadyPaid = Payment.builder()
                .order(testOrder)
                .amount(new BigDecimal("24000000"))
                .transactionCode("tx123")
                .build();
        alreadyPaid.setId(200L);

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.of(alreadyPaid));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", true);
        assertThat(result).containsEntry("duplicate", true);
        assertThat(result).containsEntry("message", "Transaction already processed");
        verify(orderRepository, never()).findById(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void processWebhook_OrderNotFound() {
        Map<String, Object> payload = Map.of(
                "id", "tx999", "transferAmount", 24000L,
                "content", "GREENPHONE999");

        when(paymentRepository.findByTransactionCode("tx999")).thenReturn(Optional.empty());
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(result).containsEntry("message", "Order not found");
    }

    @Test
    void processWebhook_NoOrderIdInContent() {
        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "No order here");

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(result).containsEntry("message", "Could not find order from content");
    }

    @Test
    void processWebhook_Underpayment_Rejected() {
        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 10000L,  // Only 10K — order expects 24M
                "content", "GREENPHONE100");

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(((String) result.get("message"))).contains("Insufficient amount");
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void processWebhook_TerminalState_Delivered_Rejected() {
        testOrder.setOrderStatus("DELIVERED");
        testOrder.setPaymentStatus("PAID");

        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(((String) result.get("message"))).contains("terminal state");
    }

    @Test
    void processWebhook_TerminalState_Cancelled_Rejected() {
        testOrder.setOrderStatus("CANCELLED");

        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(((String) result.get("message"))).contains("terminal state");
    }

    @Test
    void processWebhook_NoPaymentForOrder() {
        Map<String, Object> payload = Map.of(
                "id", "tx123", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        when(paymentRepository.findByTransactionCode("tx123")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderIdOrderByIdAsc(100L)).thenReturn(List.of());

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", false);
        assertThat(result).containsEntry("message", "No payment found for order");
    }

    @Test
    void processWebhook_AlreadyPaidPayment_GracefulDuplicate() {
        testOrder.setPaymentStatus("PAID");

        Map<String, Object> payload = Map.of(
                "id", "tx456", "transferAmount", 24000000L,
                "content", "GREENPHONE100");

        when(paymentRepository.findByTransactionCode("tx456")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderIdOrderByIdAsc(100L)).thenReturn(List.of(testPayment));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);

        assertThat(result).containsEntry("success", true);
        assertThat(result).containsEntry("duplicate", true);
        assertThat(result).containsEntry("message", "Payment already processed");
        // No new email on duplicates
        verify(emailService, never()).sendOrderConfirmation(anyString(), anyString());
    }

    // === Edge Cases ===

    @Test
    void extractOrderId_FromContentWithExtraText() {
        // Via processPaymentWebhook
        Map<String, Object> payload = Map.of(
                "id", "tx1", "transferAmount", 24000000L,
                "content", "Thanh toan GREENPHONE100 extra text");

        when(paymentRepository.findByTransactionCode("tx1")).thenReturn(Optional.empty());
        when(orderRepository.findById(100L)).thenReturn(Optional.of(testOrder));
        when(paymentRepository.findByOrderIdOrderByIdAsc(100L)).thenReturn(List.of(testPayment));
        when(paymentRepository.save(any())).thenReturn(testPayment);
        when(orderRepository.save(any())).thenReturn(testOrder);

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);
        assertThat(result).containsEntry("success", true);
    }

    @Test
    void extractOrderId_NoDigitsInContent() {
        Map<String, Object> payload = Map.of(
                "id", "tx1", "transferAmount", 1000L,
                "content", "GREENPHONE");

        when(paymentRepository.findByTransactionCode("tx1")).thenReturn(Optional.empty());

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);
        assertThat(result).containsEntry("success", false);
    }

    @Test
    void generateQRUrl_SanitizesDescription() {
        String url = sepayService.generateQRUrl(1000000L, "Đơn hàng #123 có dấu");
        // Should remove diacritics and only keep ASCII
        assertThat(url).doesNotContain("Đ");
        assertThat(url).doesNotContain("#");
    }

    @Test
    void verifyWebhookSignature_EmptySecret_AlwaysFails() {
        // Without SEPA_WEBHOOK_SECRET set, all sha256 signatures fail
        System.clearProperty("SEPAY_WEBHOOK_SECRET");
        assertThat(sepayService.verifyWebhookSignature("{}", "sha256=anything", "1")).isFalse();
    }
}
