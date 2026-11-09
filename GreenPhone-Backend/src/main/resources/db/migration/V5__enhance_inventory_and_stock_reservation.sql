-- ====================================================================================
-- Migration: V5__enhance_inventory_and_stock_reservation.sql
-- Description: Multi-warehouse management & stock reservation flow (prevents overselling)
-- ====================================================================================

-- 1. Bổ sung trường RESERVED_QUANTITY vào bảng phone_variant
ALTER TABLE `phone_variant`
    ADD COLUMN `reserved_quantity` INT NOT NULL DEFAULT 0 AFTER `stock_quantity`;

-- 2. Bảng Danh mục Kho hàng (Warehouse)
CREATE TABLE IF NOT EXISTS `warehouse` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_warehouse_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Giữ chỗ tồn kho khi checkout (Stock Reservation - Hạn 15 phút)
CREATE TABLE IF NOT EXISTS `stock_reservation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone_variant_id` BIGINT NOT NULL,
    `order_id` BIGINT NOT NULL,
    `quantity` INT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CONSUMED, RELEASED
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_res_expires` (`status`, `expires_at`),
    KEY `idx_res_variant` (`phone_variant_id`),
    KEY `idx_res_order` (`order_id`),
    CONSTRAINT `fk_res_variant` FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variant` (`id`),
    CONSTRAINT `fk_res_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed dữ liệu mẫu cho danh mục Kho hàng
INSERT IGNORE INTO `warehouse` (`id`, `code`, `name`, `address`) VALUES
(1, 'WH-HN-MAIN', 'Kho Tổng Hà Nội', 'Tòa nhà FPT, Cầu Giấy, Hà Nội'),
(2, 'WH-HCM-Q1', 'Kho Chi Nhánh TP.HCM', 'Quận 1, TP. Hồ Chí Minh');
