-- ====================================================================================
-- Migration: V7__create_warranties_and_units.sql
-- Description: Electronic Warranty (e-Warranty by IMEI & Phone) & Customer Wishlist
-- ====================================================================================

-- 1. Bảng Bảo hành điện tử (Warranty by IMEI)
CREATE TABLE IF NOT EXISTS `warranty` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `phone_variant_id` BIGINT NOT NULL,
    `imei_number` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `start_date` DATETIME NOT NULL,
    `end_date` DATETIME NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, VOID
    `note` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_warranty_imei` (`imei_number`),
    KEY `idx_warranty_phone_imei` (`customer_phone`, `imei_number`),
    KEY `idx_warranty_order` (`order_id`),
    KEY `idx_warranty_variant` (`phone_variant_id`),
    CONSTRAINT `fk_war_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
    CONSTRAINT `fk_war_variant` FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variant` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Danh sách yêu thích (Wishlist)
CREATE TABLE IF NOT EXISTS `wishlist` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `phone_id` BIGINT NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_phone_wishlist` (`user_id`, `phone_id`),
    KEY `idx_wishlist_user` (`user_id`),
    KEY `idx_wishlist_phone` (`phone_id`),
    CONSTRAINT `fk_wish_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wish_phone` FOREIGN KEY (`phone_id`) REFERENCES `phone` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
