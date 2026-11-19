-- V33__add_blocked_audit_fields_to_users.sql
-- Thêm các trường lưu trữ kiểm toán lý do khóa, thời gian khóa và người thực hiện khóa tài khoản
-- Sử dụng Dynamic SQL Idempotent an toàn tuyệt đối, tuân thủ quy chuẩn Flyway Migration của GreenPhone

-- Dọn dẹp thủ tục cũ nếu còn sót lại từ phiên trước
DROP PROCEDURE IF EXISTS add_user_blocked_audit_columns_if_not_exists;

-- 1. Thêm cột blocked_reason nếu chưa tồn tại
SET @col1_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'users' AND LOWER(COLUMN_NAME) = 'blocked_reason');
SET @sql_add_col1 = IF(@col1_exists = 0, 'ALTER TABLE users ADD COLUMN blocked_reason VARCHAR(500) NULL AFTER status', 'SELECT 1');
PREPARE stmt_add_col1 FROM @sql_add_col1;
EXECUTE stmt_add_col1;
DEALLOCATE PREPARE stmt_add_col1;

-- 2. Thêm cột blocked_at nếu chưa tồn tại
SET @col2_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'users' AND LOWER(COLUMN_NAME) = 'blocked_at');
SET @sql_add_col2 = IF(@col2_exists = 0, 'ALTER TABLE users ADD COLUMN blocked_at DATETIME NULL AFTER blocked_reason', 'SELECT 1');
PREPARE stmt_add_col2 FROM @sql_add_col2;
EXECUTE stmt_add_col2;
DEALLOCATE PREPARE stmt_add_col2;

-- 3. Thêm cột blocked_by nếu chưa tồn tại
SET @col3_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'users' AND LOWER(COLUMN_NAME) = 'blocked_by');
SET @sql_add_col3 = IF(@col3_exists = 0, 'ALTER TABLE users ADD COLUMN blocked_by VARCHAR(100) NULL AFTER blocked_at', 'SELECT 1');
PREPARE stmt_add_col3 FROM @sql_add_col3;
EXECUTE stmt_add_col3;
DEALLOCATE PREPARE stmt_add_col3;
