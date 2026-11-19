-- ======================================================================================
-- Flyway Migration V34: Hợp nhất các sản phẩm bị trùng lặp và gom toàn bộ biến thể
-- Mục tiêu: Loại bỏ 4 sản phẩm lặp đôi (iPhone 15, iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, Xiaomi 14 Ultra)
-- Giữ lại sản phẩm gốc (ID 1, 2, 3, 5), bảo toàn 100% đơn hàng, đơn nhập hàng PO, tồn kho và hình ảnh
-- ======================================================================================

-- 1. Xử lý trường hợp trùng lặp cấu hình duy nhất: Xiaomi 14 Ultra (16GB, 512GB, Đen) giữa variant 647 và variant 9
-- Gộp số lượng tồn kho từ variant 647 vào variant 9 ở từng kho chi nhánh
UPDATE `warehouse_stock` ws_dest
JOIN `warehouse_stock` ws_src ON ws_dest.warehouse_id = ws_src.warehouse_id AND ws_src.phone_variant_id = 647
SET ws_dest.quantity = ws_dest.quantity + ws_src.quantity
WHERE ws_dest.phone_variant_id = 9;

-- Đồng bộ lại tổng tồn kho stock_quantity của phone_variant 9 bằng tổng tồn kho các kho chi nhánh sau khi gộp
UPDATE `phone_variant` v
JOIN (
    SELECT phone_variant_id, COALESCE(SUM(quantity), 0) AS total_qty
    FROM `warehouse_stock`
    WHERE phone_variant_id = 9
    GROUP BY phone_variant_id
) sub ON v.id = sub.phone_variant_id
SET v.stock_quantity = sub.total_qty
WHERE v.id = 9;

-- Di chuyển các bảng liên kết từ variant 647 sang variant 9 để bảo toàn đơn hàng và lịch sử giao dịch
UPDATE `order_detail` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `purchase_order_item` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `warehouse_stock_history` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `inventory_stock_history` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `warehouse_transfer_item` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `warranty` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
UPDATE `return_request` SET `phone_variant_id` = 9 WHERE `phone_variant_id` = 647;
DELETE FROM `stock_reservation` WHERE `phone_variant_id` = 647;
DELETE FROM `cart_item` WHERE `phone_variant_id` = 647;
DELETE FROM `warehouse_stock` WHERE `phone_variant_id` = 647;
DELETE FROM `phone_variant` WHERE `id` = 647;

-- 2. Chuyển toàn bộ các biến thể còn lại từ sản phẩm thừa sang sản phẩm gốc
-- iPhone 15 Pro Max: 148 -> 1
UPDATE `phone_variant` SET `phone_id` = 1 WHERE `phone_id` = 148;
-- iPhone 15: 105 -> 2
UPDATE `phone_variant` SET `phone_id` = 2 WHERE `phone_id` = 105;
-- Samsung Galaxy S24 Ultra: 149 -> 3
UPDATE `phone_variant` SET `phone_id` = 3 WHERE `phone_id` = 149;
-- Xiaomi 14 Ultra: 150 -> 5
UPDATE `phone_variant` SET `phone_id` = 5 WHERE `phone_id` = 150;

-- 3. Cập nhật đánh giá (review) từ sản phẩm thừa sang sản phẩm gốc
UPDATE `review` SET `phone_id` = 1 WHERE `phone_id` = 148;
UPDATE `review` SET `phone_id` = 2 WHERE `phone_id` = 105;
UPDATE `review` SET `phone_id` = 3 WHERE `phone_id` = 149;
UPDATE `review` SET `phone_id` = 5 WHERE `phone_id` = 150;

-- 4. Xóa ảnh banner cũ của các sản phẩm gốc (ID 1, 2, 3, 5) để thay bằng ảnh sản phẩm Cloudflare R2 chuẩn
DELETE FROM `phone_image` WHERE `phone_id` IN (1, 2, 3, 5);

-- 5. Chuyển toàn bộ hình ảnh sản phẩm Cloudflare R2 từ ID 148, 105, 149, 150 sang ID 1, 2, 3, 5
UPDATE `phone_image` SET `phone_id` = 1 WHERE `phone_id` = 148;
UPDATE `phone_image` SET `phone_id` = 2 WHERE `phone_id` = 105;
UPDATE `phone_image` SET `phone_id` = 3 WHERE `phone_id` = 149;
UPDATE `phone_image` SET `phone_id` = 5 WHERE `phone_id` = 150;

-- 6. Di chuyển wishlist (nếu có)
UPDATE IGNORE `wishlist` SET `phone_id` = 1 WHERE `phone_id` = 148;
DELETE FROM `wishlist` WHERE `phone_id` = 148;
UPDATE IGNORE `wishlist` SET `phone_id` = 2 WHERE `phone_id` = 105;
DELETE FROM `wishlist` WHERE `phone_id` = 105;
UPDATE IGNORE `wishlist` SET `phone_id` = 3 WHERE `phone_id` = 149;
DELETE FROM `wishlist` WHERE `phone_id` = 149;
UPDATE IGNORE `wishlist` SET `phone_id` = 5 WHERE `phone_id` = 150;
DELETE FROM `wishlist` WHERE `phone_id` = 150;

-- 7. Xóa 4 sản phẩm thừa (105, 148, 149, 150) đã được di dời sạch sẽ dữ liệu con
DELETE FROM `phone` WHERE `id` IN (105, 148, 149, 150);
