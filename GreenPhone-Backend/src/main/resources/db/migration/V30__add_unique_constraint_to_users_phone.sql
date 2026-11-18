-- Migration V30: Chuẩn hóa dữ liệu và thêm ràng buộc UNIQUE cho cột PHONE trong bảng users
-- Đảm bảo an toàn dữ liệu (Data Preservation), Idempotent và xử lý triệt để các bản ghi trùng lặp trước đó

-- 1. Chuẩn hóa định dạng số điện thoại hiện có trong bảng users
UPDATE `users` 
SET `PHONE` = TRIM(`PHONE`) 
WHERE `PHONE` IS NOT NULL;

-- Chuyển đổi các định dạng quốc tế +84 hoặc 84 về đầu 0
UPDATE `users` 
SET `PHONE` = CONCAT('0', SUBSTRING(`PHONE`, 4)) 
WHERE `PHONE` LIKE '+84%' AND LENGTH(`PHONE`) >= 11;

UPDATE `users` 
SET `PHONE` = CONCAT('0', SUBSTRING(`PHONE`, 3)) 
WHERE `PHONE` LIKE '84%' AND LENGTH(`PHONE`) = 11;

-- Loại bỏ dấu chấm, dấu gạch ngang hoặc khoảng trắng xen kẽ
UPDATE `users` 
SET `PHONE` = REPLACE(REPLACE(REPLACE(`PHONE`, ' ', ''), '-', ''), '.', '')
WHERE `PHONE` LIKE '% %' OR `PHONE` LIKE '%-%' OR `PHONE` LIKE '%.%';

-- Xử lý trường hợp số điện thoại rỗng (nếu có) để tránh vi phạm UNIQUE
UPDATE `users`
SET `PHONE` = CONCAT('0999', LPAD(`ID`, 6, '0'))
WHERE `PHONE` IS NULL OR TRIM(`PHONE`) = '';

-- 2. Khử trùng lặp (Deduplication) dữ liệu lịch sử trước khi áp dụng ràng buộc UNIQUE:
-- Giữ lại số điện thoại cho tài khoản được tạo đầu tiên (MIN(id)),
-- các tài khoản trùng lặp sau đó (id > keep_id) sẽ được gắn hậu tố '_<id>' để bảo toàn dữ liệu và đảm bảo tính duy nhất
UPDATE `users` u
JOIN (
    SELECT MIN(`ID`) AS keep_id, `PHONE`
    FROM `users`
    GROUP BY `PHONE`
    HAVING COUNT(*) > 1
) dup ON u.`PHONE` = dup.`PHONE` AND u.`ID` > dup.keep_id
SET u.`PHONE` = CONCAT(LEFT(u.`PHONE`, 10), '_', u.`ID`);

-- 3. Tạo ràng buộc duy nhất UK_USERS_PHONE nếu chưa tồn tại (Idempotent)
SET @uk_phone_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND LOWER(TABLE_NAME) = 'users' 
      AND LOWER(INDEX_NAME) IN ('uk_users_phone', 'phone'));

SET @sql_add_uk = IF(@uk_phone_exists = 0, 
    'ALTER TABLE `users` ADD CONSTRAINT `UK_USERS_PHONE` UNIQUE (`PHONE`)', 
    'SELECT 1');

PREPARE stmt_add_uk FROM @sql_add_uk;
EXECUTE stmt_add_uk;
DEALLOCATE PREPARE stmt_add_uk;
