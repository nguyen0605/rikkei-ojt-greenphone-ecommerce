-- ====================================================================================
-- Migration: V6__create_suppliers_and_purchase_orders.sql
-- Description: Inbound procurement - Suppliers, Purchase Orders and Items
-- ====================================================================================

-- 1. Bảng Nhà cung cấp (Supplier)
CREATE TABLE IF NOT EXISTS `supplier` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `address` VARCHAR(255) DEFAULT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_supplier_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Đơn đặt mua hàng nhập kho (Purchase Order)
CREATE TABLE IF NOT EXISTS `purchase_order` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `po_number` VARCHAR(50) NOT NULL,
    `supplier_id` BIGINT NOT NULL,
    `warehouse_id` BIGINT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, RECEIVED, CANCELLED
    `total_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `note` TEXT DEFAULT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_po_number` (`po_number`),
    KEY `idx_po_supplier` (`supplier_id`),
    KEY `idx_po_warehouse` (`warehouse_id`),
    CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`id`),
    CONSTRAINT `fk_po_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Chi tiết Đơn đặt mua hàng (Purchase Order Item)
CREATE TABLE IF NOT EXISTS `purchase_order_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `po_id` BIGINT NOT NULL,
    `phone_variant_id` BIGINT NOT NULL,
    `quantity_ordered` INT NOT NULL,
    `quantity_received` INT NOT NULL DEFAULT 0,
    `unit_cost` DECIMAL(15,2) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_poi_po` (`po_id`),
    KEY `idx_poi_variant` (`phone_variant_id`),
    CONSTRAINT `fk_poi_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_order` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_poi_variant` FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variant` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed dữ liệu mẫu Nhà cung cấp chính hãng
INSERT IGNORE INTO `supplier` (`id`, `code`, `name`, `phone`, `email`, `address`) VALUES
(1, 'SUP-APL-VN', 'Apple Vietnam LLC', '18001127', 'contact@apple.com.vn', 'Tầng 12, Tòa nhà Deutsches Haus, 33 Lê Duẩn, Quận 1, TP.HCM'),
(2, 'SUP-FPT-SYN', 'FPT Synnex Distribution', '02473006666', 'sales@synnexfpt.com', 'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội'),
(3, 'SUP-DGW-VN', 'Digiworld Corporation', '02839290059', 'info@digiworld.com.vn', '195 Nguyễn Thái Bình, Phường 4, Tân Bình, TP.HCM');
