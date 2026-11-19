-- ==============================================================================
-- Migration V35: Remove orphaned Iqoo brand and ensure Xiaomi is active with R2 logo
-- Module: CAT (Catalog & Products)
-- ==============================================================================

-- 1. Xóa thương hiệu Iqoo (thương hiệu rác ban đầu từ V2 seed data, không có bất kỳ sản phẩm nào)
DELETE FROM `brand` WHERE LOWER(`name`) = 'iqoo' AND NOT EXISTS (SELECT 1 FROM `phone` WHERE `brand_id` = `brand`.`id`);

-- Dự phòng an toàn: nếu có liên kết khóa ngoại thì chuyển trạng thái về INACTIVE
UPDATE `brand` SET `status` = 'INACTIVE' WHERE LOWER(`name`) = 'iqoo';

-- 2. Đảm bảo thương hiệu chính thống Xiaomi luôn ở trạng thái ACTIVE và gắn logo Cloudflare R2 chuẩn
UPDATE `brand`
SET `status` = 'ACTIVE',
    `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/Xiaomi.webp',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'xiaomi';
