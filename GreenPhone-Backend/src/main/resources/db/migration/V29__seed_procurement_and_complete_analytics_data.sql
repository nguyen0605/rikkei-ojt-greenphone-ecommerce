-- ====================================================================================
-- Migration: V29__seed_procurement_and_complete_analytics_data.sql
-- Description: Bo sung nha cung cap, don nhap hang PO va du lieu don hang cho ca
--              thang 10/2026 va thang 11/2026, giup bao cao phan tich, bieu do,
--              chi so loi nhuan COGS va bang Top san pham ban chay luon day du.
-- ====================================================================================

-- 1. Bo sung cac Nha cung cap chinh hang uy tin tai Viet Nam
INSERT IGNORE INTO `supplier` (`id`, `code`, `name`, `phone`, `email`, `address`, `status`, `tax_code`) VALUES
(4, 'SUP-PETRO-SET', 'Petrosetco Distribution (PSD)', '02839117766', 'contact@psd.com.vn', 'Lầu 6, Tòa nhà PetroVietnam, 1-5 Lê Duẩn, Quận 1, TP.HCM', 'ACTIVE', '0304998822'),
(5, 'SUP-VIET-TEL', 'Viettel Commerce Company', '02462777888', 'kinhdoanh@viettelcommerce.vn', 'Số 1 Giang Văn Minh, Kim Mã, Ba Đình, Hà Nội', 'ACTIVE', '0101538094'),
(6, 'SUP-ASUS-VN', 'Asus Technology Vietnam Co., Ltd', '18006588', 'sales_vn@asus.com', 'Tầng 28, Trung tâm Thương mại Sài Gòn, 37 Tôn Đức Thắng, Quận 1, TP.HCM', 'ACTIVE', '0305011234'),
(7, 'SUP-OPPO-VN', 'Oppo Science & Technology Vietnam', '1800577776', 'service@oppo-aed.vn', 'Tầng 19, Tòa nhà Lim Tower, 9-11 Tôn Đức Thắng, Quận 1, TP.HCM', 'ACTIVE', '0312345678');

-- 2. Tao cac Don dat mua hang nhap kho (Purchase Orders) da dang trang thai
-- Cac PO trang thai 'RECEIVED' cung cap du lieu gia von bình quan gia quyen cho snapshot
INSERT IGNORE INTO `purchase_order` (`id`, `po_number`, `supplier_id`, `warehouse_id`, `status`, `total_cost`, `note`, `created_at`, `updated_at`) VALUES
(1, 'PO-202610-001', 1, 1, 'RECEIVED', 1469000000.00, 'Nhập lô hàng Apple iPhone 15 Series chính hãng đợt 1 về Kho Hà Nội', '2026-10-01 08:30:00', '2026-10-02 14:00:00'),
(2, 'PO-202610-002', 4, 2, 'RECEIVED', 1198000000.00, 'Nhập lô hàng Samsung Galaxy S24 Ultra & A55 về Kho TP.HCM', '2026-10-10 09:15:00', '2026-10-11 16:30:00'),
(3, 'PO-202611-001', 3, 1, 'RECEIVED', 938000000.00, 'Nhập bổ sung Xiaomi 14 Ultra và Redmi Note 13 Pro về Kho Hà Nội', '2026-11-01 10:00:00', '2026-11-02 11:30:00'),
(4, 'PO-202611-002', 2, 2, 'RECEIVED', 1354000000.00, 'Nhập bổ sung phân phối FPT Synnex iPhone 15 Pro Max về Kho TP.HCM', '2026-11-05 13:45:00', '2026-11-06 09:20:00'),
(5, 'PO-202611-003', 5, 3, 'RECEIVED', 785000000.00, 'Phân phối dự trữ từ Viettel Commerce về Kho Đà Nẵng', '2026-11-08 14:00:00', '2026-11-09 10:15:00'),
(6, 'PO-202611-004', 6, 1, 'ORDERED', 560000000.00, 'Đơn đặt hàng dòng Gaming ASUS ROG Phone từ hãng, đang vận chuyển', '2026-11-12 11:00:00', '2026-11-12 11:00:00'),
(7, 'PO-202611-005', 7, 2, 'ORDERED', 420000000.00, 'Đơn đặt hàng dòng OPPO Find Series, đang chờ nhà cung cấp xuất kho', '2026-11-14 15:30:00', '2026-11-14 15:30:00'),
(8, 'PO-202611-006', 1, 1, 'DRAFT', 890000000.00, 'Bản thảo kế hoạch nhập hàng mùa cao điểm mua sắm tháng 12/2026', '2026-11-16 08:00:00', '2026-11-16 08:00:00');

-- 3. Chi tiet cac dong hang nhap kho (Purchase Order Items) voi gia von chuan muc
-- PO 1: Apple iPhone (Kho Ha Noi)
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(1, 1, 1, 30, 30, 25500000.00), -- IP15PM-256-TN (Gia ban 34.990.000, von 25.500.000)
(2, 1, 2, 20, 20, 29200000.00), -- IP15PM-512-TX (Gia ban 39.990.000, von 29.200.000)
(3, 1, 3, 40, 40, 16000000.00), -- IP15-128-XM    (Gia ban 21.990.000, von 16.000.000)
(4, 1, 4, 30, 30, 18200000.00); -- IP15-256-H     (Gia ban 24.990.000, von 18.200.000)

-- PO 2: Samsung Galaxy (Kho TP.HCM)
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(5, 2, 5, 25, 25, 22500000.00), -- S24U-256-TX    (Gia ban 30.990.000, von 22.500.000)
(6, 2, 6, 15, 15, 25400000.00), -- S24U-512-TD    (Gia ban 34.990.000, von 25.400.000)
(7, 2, 7, 50, 50, 6500000.00),  -- GA55-128-XN    (Gia ban 8.990.000,  von 6.500.000)
(8, 2, 8, 35, 35, 7200000.00);  -- GA55-256-TL    (Gia ban 9.990.000,  von 7.200.000)

-- PO 3: Xiaomi (Kho Ha Noi)
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(9, 3, 9, 20, 20, 20300000.00),  -- X14U-512-D     (Gia ban 27.990.000, von 20.300.000)
(10, 3, 10, 10, 10, 24000000.00), -- X14U-1TB-T    (Gia ban 32.990.000, von 24.000.000)
(11, 3, 11, 40, 40, 4700000.00),  -- RN13P-256-XF  (Gia ban 6.490.000,  von 4.700.000)
(12, 3, 12, 30, 30, 5800000.00);  -- RN13P-512-DM  (Gia ban 7.990.000,  von 5.800.000)

-- PO 4: FPT Synnex iPhone bo sung (Kho TP.HCM)
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(13, 4, 1, 35, 35, 25600000.00),
(14, 4, 3, 30, 30, 16100000.00);

-- PO 5: Viettel Commerce ve Kho Da Nang
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(15, 5, 5, 15, 15, 22600000.00),
(16, 5, 7, 30, 30, 6550000.00),
(17, 5, 11, 30, 30, 4750000.00);

-- PO 6 & 7: ORDERED (Chua nhan hang, quantity_received = 0)
INSERT IGNORE INTO `purchase_order_item` (`id`, `po_id`, `phone_variant_id`, `quantity_ordered`, `quantity_received`, `unit_cost`) VALUES
(18, 6, 1, 15, 0, 25500000.00),
(19, 7, 5, 15, 0, 22500000.00);

-- 4. Dong bo gia von (Backfill unit_cost) cho toan bo don hang lich su
-- Gia von duoc uu tien lay tu gia nhap PO RECEIVED binh quan gia quyen;
-- neu chua co PO thi tinh theo ty le chuan 72% gia niem yet.
UPDATE `order_detail` od
JOIN `phone_variant` pv ON od.phone_variant_id = pv.id
SET od.unit_cost = ROUND(
    COALESCE(
        (SELECT SUM(poi.unit_cost * poi.quantity_received) / SUM(poi.quantity_received)
         FROM purchase_order_item poi
         JOIN purchase_order po ON poi.po_id = po.id
         WHERE poi.phone_variant_id = od.phone_variant_id
           AND po.status = 'RECEIVED'
           AND poi.quantity_received > 0),
        COALESCE(od.unit_price, pv.price, 10000000.00) * 0.72
    ),
    2
)
WHERE od.unit_cost IS NULL;

-- ====================================================================================
-- 5. DU LIEU DON HANG CHO THANG 10/2026 (01/10/2026 den 31/10/2026)
-- Giup nguoi dung khi chon bo loc thang 10/2026 tren Admin Dashboard xem duoc day du:
-- Doanh thu, Gia von COGS, Loi nhuan gop, Bien loi nhuan, Tien hoan tra, Bieu do va Top 10
-- ====================================================================================

-- Don hang Oct-01: Ngay 05/10/2026 - Da giao (Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Đặng Hoàng Long', '0912889911', '12 Thợ Nhuộm, Hoàn Kiếm, Hà Nội', 34990000.00, 500000.00, 30000.00, 34520000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Giao tận tay', 1, '2026-10-05 09:30:00', '2026-10-06 15:00:00');
SET @ord_oct_1 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_1, 1, 'iPhone 15 Pro Max', '8GB', '256GB', 'Titan Tự Nhiên', 34990000.00, 1, 34990000.00, 25500000.00, 1, '2026-10-05 09:30:00', '2026-10-05 09:30:00');

-- Don hang Oct-02: Ngay 08/10/2026 - Da giao (Thanh toan VNPAY)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Trịnh Khánh Vy', '0943887766', '88 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM', 39980000.00, 1000000.00, 0.00, 38980000.00, 'DELIVERED', 'PAID', 'VNPAY', 'Giao giờ hành chính', 1, '2026-10-08 10:15:00', '2026-10-09 14:30:00');
SET @ord_oct_2 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_oct_2, 5, 'Samsung Galaxy S24 Ultra', '12GB', '256GB', 'Titan Xám', 30990000.00, 1, 30990000.00, 22500000.00, 2, '2026-10-08 10:15:00', '2026-10-08 10:15:00'),
(@ord_oct_2, 7, 'Samsung Galaxy A55', '8GB', '128GB', 'Xanh Navy', 8990000.00, 1, 8990000.00, 6500000.00, 2, '2026-10-08 10:15:00', '2026-10-08 10:15:00');

-- Don hang Oct-03: Ngay 11/10/2026 - Da giao (Thanh toan COD)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Võ Văn Kiệt', '0977112233', '230 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng', 43980000.00, 0.00, 40000.00, 44020000.00, 'DELIVERED', 'PAID', 'COD', 'Kiểm tra máy khi nhận', 1, '2026-10-11 14:00:00', '2026-10-12 16:20:00');
SET @ord_oct_3 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_3, 3, 'iPhone 15', '6GB', '128GB', 'Xanh Mint', 21990000.00, 2, 43980000.00, 16000000.00, 3, '2026-10-11 14:00:00', '2026-10-11 14:00:00');

-- Don hang Oct-04: Ngay 14/10/2026 - Da giao (Thanh toan MOMO)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Lâm Gia Bảo', '0933557799', '142 Nguyễn Thị Minh Khai, Quận 3, TP.HCM', 27990000.00, 500000.00, 0.00, 27490000.00, 'DELIVERED', 'PAID', 'MOMO', 'Khách hàng thân thiết', 1, '2026-10-14 11:20:00', '2026-10-15 10:15:00');
SET @ord_oct_4 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_4, 9, 'Xiaomi 14 Ultra', '16GB', '512GB', 'Đen', 27990000.00, 1, 27990000.00, 20300000.00, 2, '2026-10-14 11:20:00', '2026-10-14 11:20:00');

-- Don hang Oct-05: Ngay 17/10/2026 - Da giao (Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Đào Thu Trang', '0981992288', '56 Phan Chu Trinh, Hoàn Kiếm, Hà Nội', 29460000.00, 500000.00, 30000.00, 28990000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Bọc cẩn thận', 1, '2026-10-17 16:40:00', '2026-10-18 11:00:00');
SET @ord_oct_5 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_oct_5, 11, 'Xiaomi Redmi Note 13 Pro', '8GB', '256GB', 'Xanh Forest', 6490000.00, 3, 19470000.00, 4700000.00, 1, '2026-10-17 16:40:00', '2026-10-17 16:40:00'),
(@ord_oct_5, 8, 'Samsung Galaxy A55', '8GB', '256GB', 'Tím Lilac', 9990000.00, 1, 9990000.00, 7200000.00, 1, '2026-10-17 16:40:00', '2026-10-17 16:40:00');

-- Don hang Oct-06: Ngay 20/10/2026 - Da huy (CANCELLED, UNPAID, Thanh toan COD)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Trần Quốc Đạt', '0901239876', '23 Lê Lợi, Quận 1, TP.HCM', 39990000.00, 0.00, 0.00, 39990000.00, 'CANCELLED', 'UNPAID', 'COD', 'Khách đổi ý mua màu khác', 1, '2026-10-20 13:10:00', '2026-10-20 13:25:00');
SET @ord_oct_6 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_6, 2, 'iPhone 15 Pro Max', '8GB', '512GB', 'Titan Xanh', 39990000.00, 1, 39990000.00, 29200000.00, 2, '2026-10-20 13:10:00', '2026-10-20 13:10:00');

-- Don hang Oct-07: Ngay 22/10/2026 - Da giao (Thanh toan VNPAY)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Bùi Thảo My', '0966442200', '15 Trần Phú, Hà Đông, Hà Nội', 34990000.00, 0.00, 30000.00, 35020000.00, 'DELIVERED', 'PAID', 'VNPAY', 'Giao sau 18h', 1, '2026-10-22 15:30:00', '2026-10-23 18:30:00');
SET @ord_oct_7 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_7, 6, 'Samsung Galaxy S24 Ultra', '12GB', '512GB', 'Titan Đen', 34990000.00, 1, 34990000.00, 25400000.00, 1, '2026-10-22 15:30:00', '2026-10-22 15:30:00');

-- Don hang Oct-08: Ngay 24/10/2026 - Da giao (Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Nguyễn Tiến Dũng', '0975312468', '33 Hoàng Diệu, Hải Châu, Đà Nẵng', 49980000.00, 1000000.00, 0.00, 48980000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Hẹn trước khi giao', 1, '2026-10-24 10:00:00', '2026-10-25 14:45:00');
SET @ord_oct_8 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_8, 4, 'iPhone 15', '6GB', '256GB', 'Hồng', 24990000.00, 2, 49980000.00, 18200000.00, 3, '2026-10-24 10:00:00', '2026-10-24 10:00:00');

-- Don hang Oct-09: Ngay 26/10/2026 - Da giao (Thanh toan MOMO)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Đỗ Khắc Cường', '0918273645', '77 Nguyễn Thái Học, Ba Đình, Hà Nội', 40980000.00, 500000.00, 30000.00, 40510000.00, 'DELIVERED', 'PAID', 'MOMO', 'Khách quen', 1, '2026-10-26 14:15:00', '2026-10-27 16:30:00');
SET @ord_oct_9 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_oct_9, 10, 'Xiaomi 14 Ultra', '16GB', '1TB', 'Trắng', 32990000.00, 1, 32990000.00, 24000000.00, 1, '2026-10-26 14:15:00', '2026-10-26 14:15:00'),
(@ord_oct_9, 12, 'Xiaomi Redmi Note 13 Pro', '12GB', '512GB', 'Đen Midnight', 7990000.00, 1, 7990000.00, 5800000.00, 1, '2026-10-26 14:15:00', '2026-10-26 14:15:00');

-- Don hang Oct-10: Ngay 28/10/2026 - Da giao (Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Lý Minh Triết', '0938127456', '99 Hai Bà Trưng, Bến Nghé, Quận 1, TP.HCM', 69980000.00, 2000000.00, 0.00, 67980000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Đơn hàng mua đôi cho gia đình', 1, '2026-10-28 11:45:00', '2026-10-29 10:20:00');
SET @ord_oct_10 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_oct_10, 1, 'iPhone 15 Pro Max', '8GB', '256GB', 'Titan Tự Nhiên', 34990000.00, 2, 69980000.00, 25500000.00, 2, '2026-10-28 11:45:00', '2026-10-28 11:45:00');

-- Hoan tien thang 10: 1 khoan hoan tra ngay 25/10/2026
INSERT INTO `refund` (`refund_code`, `order_id`, `amount`, `payment_method`, `status`, `reason`, `refunded_at`, `created_at`, `updated_at`)
VALUES ('REF-202610-001', @ord_oct_2, 8990000.00, 'VNPAY', 'COMPLETED', 'Khách đổi ý trả lại máy Galaxy A55 để lên đời dòng Ultra', '2026-10-25 15:30:00', '2026-10-25 14:00:00', '2026-10-25 15:30:00');

-- ====================================================================================
-- 6. DU LIEU DON HANG CHO THANG 11/2026 (01/11/2026 den 30/11/2026)
-- Doanh thu thuan, Loi nhuan gop, Bien loi nhuan, COGS, bieu do doanh thu/loi nhuan
-- va bang Top 10 san pham ban chay.
-- ====================================================================================

-- Don hang Nov-01: Ngay 02/11/2026 - Da giao (Thanh toan VietQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Nguyễn Văn Nam', '0912345678', 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', 34990000.00, 500000.00, 30000.00, 34520000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Giao giờ hành chính', 1, '2026-11-02 09:15:00', '2026-11-03 14:20:00');
SET @ord_id_1 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_1, 1, 'iPhone 15 Pro Max', '8GB', '256GB', 'Titan Tự Nhiên', 34990000.00, 1, 34990000.00, 25500000.00, 1, '2026-11-02 09:15:00', '2026-11-02 09:15:00');

-- Don hang Nov-02: Ngay 04/11/2026 - Da giao (Thanh toan VNPAY)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Trần Minh Tuấn', '0943941773', '156 Nguyễn Đình Chiểu, Quận 3, TP.HCM', 39980000.00, 1000000.00, 0.00, 38980000.00, 'DELIVERED', 'PAID', 'VNPAY', 'Giao tận tay', 1, '2026-11-04 10:30:00', '2026-11-05 16:00:00');
SET @ord_id_2 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_id_2, 3, 'iPhone 15', '6GB', '128GB', 'Xanh Mint', 21990000.00, 1, 21990000.00, 16000000.00, 2, '2026-11-04 10:30:00', '2026-11-04 10:30:00'),
(@ord_id_2, 7, 'Samsung Galaxy A55', '8GB', '128GB', 'Xanh Navy', 8990000.00, 2, 17980000.00, 6500000.00, 2, '2026-11-04 10:30:00', '2026-11-04 10:30:00');

-- Don hang Nov-03: Ngay 06/11/2026 - Da giao (Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Lê Thị Thu', '0988776655', 'Tòa FPT Complex, Ngũ Hành Sơn, Đà Nẵng', 30990000.00, 0.00, 25000.00, 31015000.00, 'DELIVERED', 'PAID', 'VIETQR', 'Gọi trước khi đến', 1, '2026-11-06 14:10:00', '2026-11-07 11:30:00');
SET @ord_id_3 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_3, 5, 'Samsung Galaxy S24 Ultra', '12GB', '256GB', 'Titan Xám', 30990000.00, 1, 30990000.00, 22500000.00, 3, '2026-11-06 14:10:00', '2026-11-06 14:10:00');

-- Don hang Nov-04: Ngay 08/11/2026 - Da giao (Thanh toan MOMO)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Hoàng Đức Huy', '0933221100', '45 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM', 34480000.00, 500000.00, 0.00, 33980000.00, 'DELIVERED', 'PAID', 'MOMO', 'Khách VIP', 1, '2026-11-08 16:40:00', '2026-11-09 15:20:00');
SET @ord_id_4 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_id_4, 9, 'Xiaomi 14 Ultra', '16GB', '512GB', 'Đen', 27990000.00, 1, 27990000.00, 20300000.00, 2, '2026-11-08 16:40:00', '2026-11-08 16:40:00'),
(@ord_id_4, 11, 'Xiaomi Redmi Note 13 Pro', '8GB', '256GB', 'Xanh Forest', 6490000.00, 1, 6490000.00, 4700000.00, 2, '2026-11-08 16:40:00', '2026-11-08 16:40:00');

-- Don hang Nov-05: Ngay 10/11/2026 - Dang giao (SHIPPING, Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Phạm Quỳnh Nga', '0977889900', 'Số 9 Duy Tân, Cầu Giấy, Hà Nội', 24990000.00, 0.00, 30000.00, 25020000.00, 'SHIPPING', 'PAID', 'VIETQR', 'Hẹn giao chiều tối', 1, '2026-11-10 11:25:00', '2026-11-11 08:30:00');
SET @ord_id_5 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_5, 4, 'iPhone 15', '6GB', '256GB', 'Hồng', 24990000.00, 1, 24990000.00, 18200000.00, 1, '2026-11-10 11:25:00', '2026-11-10 11:25:00');

-- Don hang Nov-06: Ngay 11/11/2026 - Cho dong goi (PROCESSING, Thanh toan VNPAY) - Su kien Sieu Sale 11.11
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Đỗ Văn Thành', '0966554433', '88 Quang Trung, Gò Vấp, TP.HCM', 44970000.00, 2000000.00, 0.00, 42970000.00, 'PROCESSING', 'PAID', 'VNPAY', 'Đơn Sale 11.11 bọc kỹ chống sốc', 1, '2026-11-11 00:30:00', '2026-11-11 01:00:00');
SET @ord_id_6 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_id_6, 7, 'Samsung Galaxy A55', '8GB', '128GB', 'Xanh Navy', 8990000.00, 3, 26970000.00, 6500000.00, 2, '2026-11-11 00:30:00', '2026-11-11 00:30:00'),
(@ord_id_6, 8, 'Samsung Galaxy A55', '8GB', '256GB', 'Tím Lilac', 9990000.00, 1, 9990000.00, 7200000.00, 2, '2026-11-11 00:30:00', '2026-11-11 00:30:00'),
(@ord_id_6, 12, 'Xiaomi Redmi Note 13 Pro', '12GB', '512GB', 'Đen Midnight', 7990000.00, 1, 7990000.00, 5800000.00, 2, '2026-11-11 00:30:00', '2026-11-11 00:30:00');

-- Don hang Nov-07: Ngay 12/11/2026 - Cho dong goi (PROCESSING, Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Vũ Hải Đăng', '0911223344', 'Tòa Landmark 81, Bình Thạnh, TP.HCM', 39990000.00, 500000.00, 0.00, 39490000.00, 'PROCESSING', 'PAID', 'VIETQR', 'Yêu cầu xuất hóa đơn công ty', 1, '2026-11-12 14:15:00', '2026-11-12 14:30:00');
SET @ord_id_7 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_7, 2, 'iPhone 15 Pro Max', '8GB', '512GB', 'Titan Xanh', 39990000.00, 1, 39990000.00, 29200000.00, 2, '2026-11-12 14:15:00', '2026-11-12 14:15:00');

-- Don hang Nov-08: Ngay 13/11/2026 - Dang giao (SHIPPING, Thanh toan COD)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Bùi Quốc Anh', '0971234567', '45 Trần Phú, Ba Đình, Hà Nội', 34990000.00, 0.00, 30000.00, 35020000.00, 'SHIPPING', 'PAID', 'COD', 'Cho xem hàng trước khi nhận', 1, '2026-11-13 09:40:00', '2026-11-14 08:20:00');
SET @ord_id_8 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_8, 6, 'Samsung Galaxy S24 Ultra', '12GB', '512GB', 'Titan Đen', 34990000.00, 1, 34990000.00, 25400000.00, 1, '2026-11-13 09:40:00', '2026-11-13 09:40:00');

-- Don hang Nov-09: Ngay 15/11/2026 - Cho xac nhan (PENDING, Thanh toan UNPAID)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (2, 'Ngô Gia Huy', '0909090909', '120 Bạch Đằng, Hải Châu, Đà Nẵng', 32990000.00, 0.00, 0.00, 32990000.00, 'PENDING', 'UNPAID', 'VIETQR', 'Chờ chuyển khoản ngân hàng', 1, '2026-11-15 15:50:00', '2026-11-15 15:50:00');
SET @ord_id_9 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES (@ord_id_9, 10, 'Xiaomi 14 Ultra', '16GB', '1TB', 'Trắng', 32990000.00, 1, 32990000.00, 24000000.00, 3, '2026-11-15 15:50:00', '2026-11-15 15:50:00');

-- Don hang Nov-10: Ngay 16/11/2026 - Cho dong goi (PROCESSING, Thanh toan VIETQR)
INSERT INTO `orders` (`user_id`, `receiver_name`, `receiver_phone`, `shipping_address`, `total_amount`, `discount_amount`, `shipping_fee`, `final_amount`, `order_status`, `payment_status`, `payment_method`, `note`, `version`, `created_at`, `updated_at`)
VALUES (6, 'Dương Bảo Châu', '0938475612', '72 Bà Triệu, Hoàn Kiếm, Hà Nội', 25960000.00, 500000.00, 30000.00, 25490000.00, 'PROCESSING', 'PAID', 'VIETQR', 'Giao kèm quà tặng nếu có', 1, '2026-11-16 11:10:00', '2026-11-16 11:20:00');
SET @ord_id_10 = LAST_INSERT_ID();

INSERT INTO `order_detail` (`order_id`, `phone_variant_id`, `product_name`, `ram`, `storage`, `color`, `unit_price`, `quantity`, `subtotal`, `unit_cost`, `warehouse_id`, `created_at`, `updated_at`)
VALUES 
(@ord_id_10, 11, 'Xiaomi Redmi Note 13 Pro', '8GB', '256GB', 'Xanh Forest', 6490000.00, 2, 12980000.00, 4700000.00, 1, '2026-11-16 11:10:00', '2026-11-16 11:10:00'),
(@ord_id_10, 12, 'Xiaomi Redmi Note 13 Pro', '12GB', '512GB', 'Đen Midnight', 7990000.00, 1, 7990000.00, 5800000.00, 1, '2026-11-16 11:10:00', '2026-11-16 11:10:00'),
(@ord_id_10, 8, 'Samsung Galaxy A55', '8GB', '256GB', 'Tím Lilac', 9990000.00, 1, 9990000.00, 7200000.00, 1, '2026-11-16 11:10:00', '2026-11-16 11:10:00');
