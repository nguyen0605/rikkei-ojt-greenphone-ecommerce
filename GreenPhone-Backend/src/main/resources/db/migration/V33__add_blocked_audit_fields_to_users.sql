-- V33__add_blocked_audit_fields_to_users.sql
-- Thêm các trường lưu trữ kiểm toán lý do khóa, thời gian khóa và người thực hiện khóa tài khoản

DELIMITER //

CREATE PROCEDURE add_user_blocked_audit_columns_if_not_exists()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'USERS'
          AND COLUMN_NAME = 'BLOCKED_REASON'
    ) THEN
        ALTER TABLE USERS ADD COLUMN BLOCKED_REASON VARCHAR(500) NULL AFTER STATUS;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'USERS'
          AND COLUMN_NAME = 'BLOCKED_AT'
    ) THEN
        ALTER TABLE USERS ADD COLUMN BLOCKED_AT DATETIME NULL AFTER BLOCKED_REASON;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'USERS'
          AND COLUMN_NAME = 'BLOCKED_BY'
    ) THEN
        ALTER TABLE USERS ADD COLUMN BLOCKED_BY VARCHAR(100) NULL AFTER BLOCKED_AT;
    END IF;
END //

DELIMITER ;

CALL add_user_blocked_audit_columns_if_not_exists();
DROP PROCEDURE IF EXISTS add_user_blocked_audit_columns_if_not_exists();
