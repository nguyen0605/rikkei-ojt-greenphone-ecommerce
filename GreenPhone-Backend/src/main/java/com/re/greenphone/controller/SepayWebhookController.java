package com.re.greenphone.controller;

import com.re.greenphone.service.SepayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/sepay")
@RequiredArgsConstructor
@Slf4j
public class SepayWebhookController {

    private final SepayService sepayService;

    /**
     * Receive Sepay payment webhook.
     * Per Sepay docs: must return HTTP 200 with {"success": true} within 30 seconds.
     * Failed processing returns a NON-200 status so Sepay retries the delivery.
     * Auth methods (pick ONE when configuring the webhook): API Key via
     * Authorization: Apikey <token>, or HMAC-SHA256 via X-SePay-Signature +
     * X-SePay-Timestamp headers.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> receivePayment(
            @RequestBody String rawPayload,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-SePay-Signature", required = false) String signature,
            @RequestHeader(value = "X-SePay-Timestamp", required = false) String timestamp) {

        log.info("Received Sepay webhook");

        // Per Sepay docs: signature comes via Authorization (Apikey) OR X-SePay-Signature (sha256).
        // Evaluate BOTH independently — accepting when ANY is valid avoids rejecting
        // valid webhooks when the other header is absent or stale.
        if (authorization == null && signature == null) {
            log.warn("Webhook rejected: missing both Authorization and X-SePay-Signature headers");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false,
                    "message", "Missing signature"));
        }

        boolean signatureOk = (authorization != null && sepayService.verifyWebhookSignature(rawPayload, authorization, timestamp))
                || (signature != null && sepayService.verifyWebhookSignature(rawPayload, signature, timestamp));
        if (!signatureOk) {
            log.warn("Webhook rejected: invalid signature (authorization={}, x-sepay-signature={})",
                    authorization != null, signature != null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false,
                    "message", "Invalid signature"));
        }

        Map<String, Object> payload = sepayService.parseWebhookPayload(rawPayload);
        if (payload.isEmpty()) {
            log.warn("Webhook rejected: unparseable payload");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("success", false,
                    "message", "Invalid payload"));
        }
        log.info("Sepay transaction: id={}, amount={}, content={}",
                payload.get("id"), payload.get("transferAmount"), payload.get("content"));

        Map<String, Object> result = sepayService.processPaymentWebhook(payload);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        if (!success) {
            // Non-200 so Sepay retries (e.g. amount mismatch, order in terminal state)
            log.warn("Webhook processed with failure: {}", result);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
        }
        return ResponseEntity.ok(result);
    }
}
