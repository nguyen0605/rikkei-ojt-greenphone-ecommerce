-- ====================================================================================
-- Migration: V11__create_refund_transactions.sql
-- Description: Audit and tracking ledger for order refund transactions [ORD-21]
-- ====================================================================================

CREATE TABLE IF NOT EXISTS `refund_transaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `payment_id` BIGINT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, PROCESSING, COMPLETED, REJECTED
    `reason` VARCHAR(255) NOT NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account` VARCHAR(50) NULL,
    `account_holder` VARCHAR(100) NULL,
    `transaction_ref` VARCHAR(100) NULL,
    `requested_by` BIGINT NOT NULL,
    `processed_by` BIGINT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `refunded_at` DATETIME(6) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_refund_order` (`order_id`),
    KEY `idx_refund_status` (`status`),
    CONSTRAINT `fk_refund_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_refund_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

