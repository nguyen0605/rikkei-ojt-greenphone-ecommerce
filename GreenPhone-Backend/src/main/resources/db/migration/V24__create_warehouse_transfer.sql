-- V21: Inter-Warehouse Transfer and Centralized Fulfillment (INV-08 Phương án B)
-- 1. Add reserved_quantity to warehouse_stock for location-level reservations
ALTER TABLE `warehouse_stock`
    ADD COLUMN `reserved_quantity` INT NOT NULL DEFAULT 0 AFTER `quantity`,
    ADD CONSTRAINT `ck_ws_reserved` CHECK (`reserved_quantity` >= 0),
    ADD CONSTRAINT `ck_ws_available` CHECK (`quantity` >= `reserved_quantity`);

-- 2. Add fulfillment_warehouse_id to orders
ALTER TABLE `orders`
    ADD COLUMN `fulfillment_warehouse_id` BIGINT NULL AFTER `user_promotion_id`,
    ADD CONSTRAINT `fk_orders_fulfillment_warehouse` FOREIGN KEY (`fulfillment_warehouse_id`) REFERENCES `warehouse` (`id`);

-- 3. Add warehouse_id to users for staff warehouse tenancy scoping (FINDING-IDOR-01)
ALTER TABLE `users`
    ADD COLUMN `warehouse_id` BIGINT NULL AFTER `role_id`,
    ADD CONSTRAINT `fk_users_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`id`);

-- 4. Create warehouse_transfer table
CREATE TABLE IF NOT EXISTS `warehouse_transfer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transfer_code` VARCHAR(50) NOT NULL,
    `order_id` BIGINT NOT NULL,
    `source_warehouse_id` BIGINT NOT NULL,
    `destination_warehouse_id` BIGINT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(255) NULL,
    `created_by` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    `dispatched_by` VARCHAR(100) NULL,
    `received_by` VARCHAR(100) NULL,
    `dispatched_at` DATETIME(6) NULL,
    `received_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT `uq_warehouse_transfer_code` UNIQUE (`transfer_code`),
    CONSTRAINT `uq_wt_order_source` UNIQUE (`order_id`, `source_warehouse_id`),
    CONSTRAINT `ck_wt_diff_warehouse` CHECK (`source_warehouse_id` <> `destination_warehouse_id`),
    CONSTRAINT `fk_wt_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
    CONSTRAINT `fk_wt_source` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouse` (`id`),
    CONSTRAINT `fk_wt_destination` FOREIGN KEY (`destination_warehouse_id`) REFERENCES `warehouse` (`id`),
    INDEX `idx_wt_order` (`order_id`),
    INDEX `idx_wt_source_status` (`source_warehouse_id`, `status`),
    INDEX `idx_wt_dest_status` (`destination_warehouse_id`, `status`),
    INDEX `idx_wt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create warehouse_transfer_item table
CREATE TABLE IF NOT EXISTS `warehouse_transfer_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transfer_id` BIGINT NOT NULL,
    `phone_variant_id` BIGINT NOT NULL,
    `requested_quantity` INT NOT NULL,
    `dispatched_quantity` INT NOT NULL DEFAULT 0,
    `received_quantity` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT `uq_wti_transfer_variant` UNIQUE (`transfer_id`, `phone_variant_id`),
    CONSTRAINT `fk_wti_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `warehouse_transfer` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wti_variant` FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variant` (`id`),
    CONSTRAINT `ck_wti_requested` CHECK (`requested_quantity` > 0),
    CONSTRAINT `ck_wti_dispatched` CHECK (`dispatched_quantity` >= 0 AND `dispatched_quantity` <= `requested_quantity`),
    CONSTRAINT `ck_wti_received` CHECK (`received_quantity` >= 0 AND `received_quantity` <= `dispatched_quantity`),
    INDEX `idx_wti_transfer` (`transfer_id`),
    INDEX `idx_wti_variant` (`phone_variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
