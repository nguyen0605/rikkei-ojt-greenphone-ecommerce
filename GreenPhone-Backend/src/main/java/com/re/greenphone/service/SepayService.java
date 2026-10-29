package com.re.greenphone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.Payment;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PaymentRepository;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SepayService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    public String generateQRUrl(long amount, String description) {
        String acc = getEnv("SEPAY_ACCOUNT_NUMBER", "0943941773");
        String bank = getEnv("SEPAY_BANK_CODE", "MBB");
        String template = "compact";
        String store = getEnv("SEPAY_STORE_NAME", "GreenPhone");

        return String.format(
                "https://vietqr.app/img?acc=%s&bank=%s&amount=%d&des=%s&template=%s&store=%s",
                acc, bank, amount, sanitizeDescription(description), template,
                sanitizeDescription(store));
    }

    /**
     * Verify a Sepay webhook signature.
     *
     * <p>Two mutually exclusive auth methods (per Sepay docs — the user picks ONE
     * when configuring the webhook at my.sepay.vn/webhooks):
     * <ul>
     *   <li><b>HMAC-SHA256</b>: headers {@code X-SePay-Signature: sha256=<hex>} and
     *       {@code X-SePay-Timestamp: <unix seconds>}; signature = HMAC-SHA256 of
     *       {@code "<timestamp>.<raw_body>"} with the secret, hex-encoded, with a
     *       5-minute replay window.</li>
     *   <li><b>API Key</b>: header {@code Authorization: Apikey <token>} compared
     *       against SEPA_API_TOKEN.</li>
     * </ul>
     */
    public boolean verifyWebhookSignature(String rawPayload, String signatureHeader, String timestampHeader) {
        String secret = getEnv("SEPAY_WEBHOOK_SECRET", "");
        if (secret.isEmpty()) {
            log.error("SEPAY_WEBHOOK_SECRET is not configured");
            return false;
        }

        if (signatureHeader == null || rawPayload == null) {
            return false;
        }

        try {
            String header = signatureHeader.trim();
            String lower = header.toLowerCase(java.util.Locale.ROOT);
            if (lower.startsWith("sha256=")) {
                // HMAC-SHA256: timestamp.raw_body, hex-encoded — replay window 5 minutes
                if (timestampHeader == null) {
                    log.warn("X-SePay-Timestamp header missing for HMAC signature");
                    return false;
                }
                long ts;
                try {
                    ts = Long.parseLong(timestampHeader.trim());
                } catch (NumberFormatException e) {
                    log.warn("Invalid X-SePay-Timestamp value: {}", timestampHeader);
                    return false;
                }
                if (Math.abs(System.currentTimeMillis() / 1000 - ts) > 300) {
                    log.warn("Webhook timestamp outside 5-minute window: ts={}", ts);
                    return false;
                }
                String signedData = ts + "." + rawPayload;
                String expectedSig = "sha256=" + hmacSha256Hex(signedData, secret);
                return MessageDigest.isEqual(
                        expectedSig.getBytes(StandardCharsets.UTF_8),
                        header.getBytes(StandardCharsets.UTF_8));
            } else if (lower.startsWith("apikey ")) {
                // API Key method: Authorization: Apikey <token>
                String apiKey = header.substring(7).trim();
                String expectedKey = getEnv("SEPAY_API_TOKEN", "");
                if (expectedKey.isEmpty()) {
                    log.error("SEPAY_API_TOKEN is not configured");
                    return false;
                }
                return apiKey.equals(expectedKey);
            }
            return false;
        } catch (Exception e) {
            log.error("Failed to verify webhook signature", e);
            return false;
        }
    }

    public Map<String, Object> parseWebhookPayload(String rawPayload) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(rawPayload, Map.class);
            return payload;
        } catch (Exception e) {
            log.error("Failed to parse webhook payload", e);
            return Map.of();
        }
    }

    /**
     * Process a Sepay payment webhook with full validation:
     * - Idempotency: checks transactionCode uniqueness (DB constraint + explicit check)
     * - Amount validation: compares transferAmount with order.finalAmount (>= allows small rounding,
     *   but a materially different amount is rejected — customer cannot pay the wrong order)
     * - Status guard: won't modify orders in terminal states
     */
    public Map<String, Object> processPaymentWebhook(Map<String, Object> payload) {
        String transactionId = payload.get("id") != null ? payload.get("id").toString() : "";
        String content = (String) payload.getOrDefault("content", "");
        Object amountObj = payload.get("transferAmount");
        long amount = amountObj instanceof Number ? ((Number) amountObj).longValue() : 0;

        log.info("Processing webhook: txId={}, amount={}, content={}", transactionId, amount, content);

        // === IDEMPOTENCY: Check if transaction already processed ===
        if (!transactionId.isEmpty()) {
            Optional<Payment> existing = paymentRepository.findByTransactionCode(transactionId);
            if (existing.isPresent()) {
                Payment p = existing.get();
                log.info("Duplicate webhook ignored: txId={} already processed as paymentId={}",
                        transactionId, p.getId());
                return Map.of("success", true, "orderId", p.getOrder().getId(),
                        "paymentId", p.getId(), "duplicate", true,
                        "message", "Transaction already processed");
            }
        }

        // === Extract order ID from content ===
        Long orderId = extractOrderId(content);
        if (orderId == null) {
            log.warn("Could not extract order ID from content: {}", content);
            return Map.of("success", false, "message", "Could not find order from content");
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            log.warn("Order not found: {}", orderId);
            return Map.of("success", false, "message", "Order not found");
        }

        // === Guard: Don't modify orders in terminal states ===
        if (List.of("DELIVERED", "CANCELLED").contains(order.getOrderStatus())) {
            log.warn("Order {} is in terminal state {}, ignoring webhook", orderId, order.getOrderStatus());
            return Map.of("success", false, "message",
                    "Order is in terminal state: " + order.getOrderStatus());
        }

        // === Amount validation: Compare transferAmount with order.finalAmount ===
        BigDecimal orderAmount = order.getFinalAmount();
        BigDecimal transferAmount = BigDecimal.valueOf(amount);
        // Accept >= (banks may add rounding) but reject any amount below expected;
        // a customer cannot settle the wrong order because the content must match orderId.
        if (transferAmount.compareTo(orderAmount) < 0) {
            log.warn("Underpayment detected: order {}, expected={}, received={}",
                    orderId, orderAmount, transferAmount);
            return Map.of("success", false, "message",
                    "Insufficient amount: expected " + orderAmount + ", received " + transferAmount);
        }

        // === Payment lookup (deterministic: earliest row first) ===
        List<Payment> payments = paymentRepository.findByOrderIdOrderByIdAsc(orderId);
        if (payments.isEmpty()) {
            log.warn("No payment found for order: {}", orderId);
            return Map.of("success", false, "message", "No payment found for order");
        }

        Payment payment = payments.get(0);

        // === Status guard: Already PAID (order.paymentStatus is the single source of truth) ===
        if ("PAID".equals(order.getPaymentStatus())) {
            log.info("Order {} already PAID, ignoring duplicate", orderId);
            return Map.of("success", true, "orderId", orderId, "paymentId", payment.getId(),
                    "duplicate", true, "message", "Payment already processed");
        }

        // === Process payment ===
        try {
            payment.setTransactionCode(transactionId);
            payment.setPaymentProvider("SEPAY");
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);

            order.setPaymentStatus("PAID");
            order.setOrderStatus("CONFIRMED");
            orderRepository.save(order);

            // Bank-transfer order is now actually paid — send the confirmation email now
            // (OrderService.createOrder skips it for VIETQR so the user isn't emailed before paying)
            if (order.getUser() != null && order.getUser().getEmail() != null) {
                emailService.sendOrderConfirmation(order.getUser().getEmail(), String.valueOf(orderId));
            }

            log.info("Payment confirmed: orderId={}, txId={}, amount={}", orderId, transactionId, amount);
            return Map.of("success", true, "orderId", orderId, "paymentId", payment.getId());
        } catch (DataIntegrityViolationException e) {
            // Transaction code uniqueness violation — duplicate webhook racing
            log.warn("Race condition on transactionCode uniqueness: txId={}", transactionId);
            return Map.of("success", true, "orderId", orderId,
                    "message", "Transaction already processed (concurrent)");
        }
    }

    private Long extractOrderId(String content) {
        if (content == null) return null;
        // Case-insensitive contains match — banks may send the content with
        // different casing ("greenphone12", "GreenPhone 12", ...).
        String upper = content.toUpperCase(java.util.Locale.ROOT);
        String prefix = "GREENPHONE";
        int idx = upper.indexOf(prefix);
        if (idx < 0) return null;
        String numPart = content.substring(idx + prefix.length());
        StringBuilder digits = new StringBuilder();
        for (char c : numPart.toCharArray()) {
            if (Character.isDigit(c)) digits.append(c);
            else break;
        }
        if (digits.isEmpty()) return null;
        try {
            return Long.parseLong(digits.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String sanitizeDescription(String desc) {
        if (desc == null) return "thanh%20toan%20don%20hang";
        // VietQR: only ASCII, no diacritics, URL-encoded
        String sanitized = desc.replaceAll("[^a-zA-Z0-9 ]", "")
                .trim()
                .replace(" ", "%20");
        return sanitized.length() > 80 ? sanitized.substring(0, 80) : sanitized;
    }

    private String hmacSha256Hex(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(raw);
    }

    /** Public accessor so other services (e.g. PaymentService) read the same SEPA env vars. */
    public String getEnvValue(String key, String defaultValue) {
        String value = System.getProperty(key);
        if (value == null) {
            value = System.getenv(key);
        }
        return value != null ? value : defaultValue;
    }

    private String getEnv(String key, String defaultValue) {
        return getEnvValue(key, defaultValue);
    }
}
