-- Migration V10: Create warranty claims, return requests and refunds
-- Module: WAR (Warranty & After-Sales) - Task WAR-04

CREATE TABLE IF NOT EXISTS return_request (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    return_code VARCHAR(100) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    phone_variant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    error_description TEXT NOT NULL,
    proof_images_json TEXT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'EXCHANGE',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    refund_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    admin_note VARCHAR(255) NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_return_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_variant FOREIGN KEY (phone_variant_id) REFERENCES phone_variant (id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_return_order_id ON return_request (order_id);
CREATE INDEX idx_return_user_id ON return_request (user_id);
CREATE INDEX idx_return_status ON return_request (status);

CREATE TABLE IF NOT EXISTS refund (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_code VARCHAR(100) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    return_request_id BIGINT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    reason VARCHAR(255) NOT NULL,
    transaction_ref VARCHAR(100) NULL,
    refunded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
    CONSTRAINT fk_refund_return FOREIGN KEY (return_request_id) REFERENCES return_request (id) ON DELETE SET NULL
);

CREATE INDEX idx_refund_order_id ON refund (order_id);
CREATE INDEX idx_refund_return_id ON refund (return_request_id);

CREATE TABLE IF NOT EXISTS warranty_claim (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    claim_code VARCHAR(100) NOT NULL UNIQUE,
    warranty_id BIGINT NOT NULL,
    issue_description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    resolution VARCHAR(255) NULL,
    rejection_reason VARCHAR(255) NULL,
    received_by BIGINT NULL,
    received_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_warranty_claim_warranty FOREIGN KEY (warranty_id) REFERENCES warranty (id) ON DELETE CASCADE,
    CONSTRAINT fk_warranty_claim_receiver FOREIGN KEY (received_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_warranty_claim_warranty_id ON warranty_claim (warranty_id);
