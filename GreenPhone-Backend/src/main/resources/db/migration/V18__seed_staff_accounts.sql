-- Migration V18: Seed initial staff accounts for various business roles
-- Roles: SALES, WAREHOUSE, MARKETING
-- Default password for all seed staff: 123456789

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Nguyễn Văn Kinh Doanh', 'sales.nguyen@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234001', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'SALES'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'sales.nguyen@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Trần Thị Bán Hàng', 'sales.tran@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234002', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'SALES'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'sales.tran@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Lê Văn Kho Vận', 'warehouse.le@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234003', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'WAREHOUSE'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'warehouse.le@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Phạm Quốc Quản Kho', 'warehouse.pham@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234004', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'WAREHOUSE'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'warehouse.pham@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Hoàng Thị Tiếp Thị', 'marketing.hoang@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234005', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'MARKETING'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'marketing.hoang@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Vũ Anh Marketing', 'marketing.vu@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234006', r.id, 'ACTIVE', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'MARKETING'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'marketing.vu@greenphone.vn');

INSERT INTO `users` (`full_name`, `email`, `password`, `phone`, `role_id`, `status`, `created_at`, `updated_at`)
SELECT 'Đặng Văn Tạm Khóa', 'staff.locked@greenphone.vn', '$2a$10$SJMqz1CDsOx42divvkACN.mXUPW.Kehnz59HSMy30iRLMT4t9C/P2', '0901234007', r.id, 'BLOCKED', NOW(6), NOW(6)
FROM `role` r WHERE r.name = 'SALES'
AND NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'staff.locked@greenphone.vn');
