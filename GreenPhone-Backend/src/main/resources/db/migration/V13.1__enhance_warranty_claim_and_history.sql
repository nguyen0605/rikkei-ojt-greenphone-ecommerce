-- Migration V13: Enhance warranty claim with hardware issue type, repair cost and create history ledger
-- Module: WAR (Warranty & After-Sales) - Task WAR-08

ALTER TABLE warranty_claim
    ADD COLUMN hardware_issue_type VARCHAR(50) NOT NULL DEFAULT 'OTHER' AFTER status,
    ADD COLUMN is_under_warranty BOOLEAN NOT NULL DEFAULT TRUE AFTER hardware_issue_type,
    ADD COLUMN repair_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER is_under_warranty,
    ADD COLUMN customer_note VARCHAR(255) NULL AFTER repair_cost,
    ADD COLUMN created_by_name VARCHAR(100) NULL AFTER customer_note;

CREATE TABLE IF NOT EXISTS warranty_claim_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    warranty_claim_id BIGINT NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    action VARCHAR(50) NOT NULL,
    note VARCHAR(255) NULL,
    performed_by BIGINT NULL,
    performed_by_name VARCHAR(100) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_wch_warranty_claim FOREIGN KEY (warranty_claim_id) REFERENCES warranty_claim (id) ON DELETE CASCADE,
    CONSTRAINT fk_wch_user FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_wch_claim_created ON warranty_claim_history (warranty_claim_id, created_at);
