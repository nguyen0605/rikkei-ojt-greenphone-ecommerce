-- Run once, with application stock writers stopped during the backfill.
-- Existing aggregate quantities are assigned to Hanoi, never copied to every branch.
CREATE TABLE IF NOT EXISTS warehouse_stock (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 warehouse_id BIGINT NOT NULL,
 phone_variant_id BIGINT NOT NULL,
 quantity INT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
 CONSTRAINT uq_warehouse_variant UNIQUE (warehouse_id, phone_variant_id),
 CONSTRAINT fk_ws_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
 CONSTRAINT fk_ws_variant FOREIGN KEY (phone_variant_id) REFERENCES phone_variant(id),
 CONSTRAINT ck_ws_quantity CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO warehouse_stock(warehouse_id, phone_variant_id, quantity)
 SELECT (SELECT id FROM warehouse WHERE code = 'WH-HN-MAIN'), v.id, v.stock_quantity FROM phone_variant v;

-- Safely add warehouse_id to order_detail if not present
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_detail' AND COLUMN_NAME = 'warehouse_id');
SET @sql_stmt = IF(@col_exists = 0, 'ALTER TABLE order_detail ADD COLUMN warehouse_id BIGINT NULL, ADD CONSTRAINT fk_order_detail_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id)', 'SELECT 1');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE order_detail SET warehouse_id = (SELECT id FROM warehouse WHERE code = 'WH-HN-MAIN') WHERE warehouse_id IS NULL;

CREATE TABLE IF NOT EXISTS warehouse_stock_history (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 warehouse_id BIGINT NOT NULL,
 phone_variant_id BIGINT NOT NULL,
 change_type VARCHAR(30) NOT NULL,
 quantity_before INT NOT NULL,
 quantity_change INT NOT NULL,
 quantity_after INT NOT NULL,
 reason VARCHAR(255) NOT NULL,
 changed_by_name VARCHAR(100) NOT NULL,
 transfer_reference VARCHAR(36) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_wsh_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
 CONSTRAINT fk_wsh_variant FOREIGN KEY (phone_variant_id) REFERENCES phone_variant(id),
 CONSTRAINT ck_wsh_quantity CHECK (quantity_after >= 0),
 INDEX idx_wsh_warehouse_created (warehouse_id, created_at, id),
 INDEX idx_wsh_variant_created (phone_variant_id, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO warehouse_stock_history(warehouse_id, phone_variant_id, change_type,
 quantity_before, quantity_change, quantity_after, reason, changed_by_name)
 SELECT warehouse_id, phone_variant_id, 'OPENING', 0, quantity, quantity,
 'Opening allocation from aggregate stock (V12)', 'SYSTEM' FROM warehouse_stock WHERE quantity > 0;
