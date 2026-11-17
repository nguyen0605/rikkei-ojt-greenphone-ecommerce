-- Historical costs intentionally remain NULL: never fabricate past margins.
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'order_detail' AND LOWER(COLUMN_NAME) = 'unit_cost');
SET @sql_add_col = IF(@col_exists = 0, 'ALTER TABLE order_detail ADD COLUMN unit_cost DECIMAL(19,6) NULL', 'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @idx1_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'orders' AND LOWER(INDEX_NAME) = 'idx_orders_payment_created');
SET @sql_idx1 = IF(@idx1_exists = 0, 'CREATE INDEX idx_orders_payment_created ON orders(payment_status, created_at)', 'SELECT 1');
PREPARE stmt_idx1 FROM @sql_idx1;
EXECUTE stmt_idx1;
DEALLOCATE PREPARE stmt_idx1;

SET @idx2_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'refund' AND LOWER(INDEX_NAME) = 'idx_refund_status_refunded');
SET @sql_idx2 = IF(@idx2_exists = 0, 'CREATE INDEX idx_refund_status_refunded ON refund(status, refunded_at)', 'SELECT 1');
PREPARE stmt_idx2 FROM @sql_idx2;
EXECUTE stmt_idx2;
DEALLOCATE PREPARE stmt_idx2;
