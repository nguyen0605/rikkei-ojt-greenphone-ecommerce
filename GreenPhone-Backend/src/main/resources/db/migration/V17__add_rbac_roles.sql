-- V17: Insert RBAC Roles for Admin business functions (Idempotent)
INSERT INTO `role` (`NAME`, `DESCRIPTION`, `CREATED_AT`, `UPDATED_AT`)
SELECT 'SALES', 'Nhan vien kinh doanh va don hang', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `NAME` = 'SALES');

INSERT INTO `role` (`NAME`, `DESCRIPTION`, `CREATED_AT`, `UPDATED_AT`)
SELECT 'WAREHOUSE', 'Nhan vien quan ly kho va bao hanh', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `NAME` = 'WAREHOUSE');

INSERT INTO `role` (`NAME`, `DESCRIPTION`, `CREATED_AT`, `UPDATED_AT`)
SELECT 'MARKETING', 'Nhan vien tiep thi va san pham', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `NAME` = 'MARKETING');
