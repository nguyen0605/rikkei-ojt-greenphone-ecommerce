package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.enums.ReturnType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "return_request")
public class ReturnRequest extends BaseEntity {

    @Column(name = "return_code", nullable = false, unique = true, length = 100)
    private String returnCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phone_variant_id", nullable = false)
    private PhoneVariant phoneVariant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "error_description", nullable = false, columnDefinition = "TEXT")
    private String errorDescription;

    @Column(name = "proof_images_json", columnDefinition = "LONGTEXT")
    private String proofImagesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    @Builder.Default
    private ReturnType type = ReturnType.EXCHANGE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.PENDING;

    @Column(name = "refund_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "admin_note", length = 255)
    private String adminNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}

