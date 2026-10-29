-- ============================================================
-- GreenPhone — Dữ liệu mẫu (Seed Data)
-- Ảnh sản phẩm lấy từ Google Images (official product photos)
-- Tổng: 6 hãng, 12 điện thoại, 24 biến thể, 5 user, 4 KM, 3 đơn, 5 review, 3 banner
-- ============================================================

USE greenphone;

-- =========================
-- 1. BRAND (6 hãng)
-- =========================
INSERT INTO `BRAND` (`ID`, `NAME`, `LOGO_URL`, `STATUS`) VALUES
(1, 'Apple',     'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 'ACTIVE'),
(2, 'Samsung',   'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg', 'ACTIVE'),
(3, 'Xiaomi',    'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg', 'ACTIVE'),
(4, 'OPPO',      'https://upload.wikimedia.org/wikipedia/commons/a/a2/OPPO_LOGO_2019.png', 'ACTIVE'),
(5, 'Realme',    'https://upload.wikimedia.org/wikipedia/commons/1/1f/Realme_logo.png', 'ACTIVE'),
(6, 'Vivo',      'https://upload.wikimedia.org/wikipedia/commons/f/f2/Vivo_logo.svg', 'ACTIVE');

-- =========================
-- 2. PHONE (12 điện thoại)
-- =========================
INSERT INTO `PHONE` (`ID`, `BRAND_ID`, `NAME`, `DESCRIPTION`, `SCREEN`, `OS`, `CHIP`, `REAR_CAMERA`, `FRONT_CAMERA`, `BATTERY`, `WARRANTY`, `STATUS`) VALUES
-- Apple
(1, 1, 'iPhone 15 Pro Max',
 'iPhone 15 Pro Max với khung Titan chuẩn 5, chip A17 Pro mạnh mẽ nhất từ trước đến nay, camera 48MP chụp đêm xuất sắc, màn hình Super Retina XDR 120Hz và cổng USB-C lần đầu xuất hiện.',
 '6.7 inch Super Retina XDR OLED 120Hz', 'iOS 17', 'Apple A17 Pro (3nm)', '48MP + 12MP ultrawide + 12MP 5x tele', '12MP TrueDepth', '4441mAh', '12 tháng chính hãng', 'ACTIVE'),

(2, 1, 'iPhone 15',
 'iPhone 15 với Dynamic Island, chip A16 Bionic, camera 48MP, cổng USB-C và mặt lưng kính màu sắc tươi mới. Hiệu năng mạnh mẽ trong thiết kế nhỏ gọn.',
 '6.1 inch Super Retina XDR OLED 60Hz', 'iOS 17', 'Apple A16 Bionic (4nm)', '48MP + 12MP ultrawide', '12MP TrueDepth', '3349mAh', '12 tháng chính hãng', 'ACTIVE'),

-- Samsung
(3, 2, 'Samsung Galaxy S24 Ultra',
 'Galaxy S24 Ultra với Galaxy AI đột phá, vi xử lý Snapdragon 8 Gen 3 for Galaxy, bút S Pen, camera 200MP zoom quang 5x, khung Titan bền bỉ.',
 '6.8 inch Dynamic AMOLED 2X 120Hz', 'Android 14 (One UI 6.1)', 'Snapdragon 8 Gen 3 for Galaxy', '200MP + 12MP UW + 10MP 3x + 50MP 5x', '12MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

(4, 2, 'Samsung Galaxy A55 5G',
 'Galaxy A55 5G với khung kim loại cao cấp, chip Exynos 1480 mới, camera 50MP chống rung OIS, màn hình Super AMOLED 120Hz, pin 5000mAh.',
 '6.6 inch Super AMOLED 120Hz', 'Android 14 (One UI 6.1)', 'Exynos 1480 (4nm)', '50MP OIS + 12MP UW + 5MP macro', '32MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

-- Xiaomi
(5, 3, 'Xiaomi 14 Ultra',
 'Xiaomi 14 Ultra đỉnh cao nhiếp ảnh Leica với cảm biến 1 inch Sony LYT-900, chip Snapdragon 8 Gen 3, màn hình AMOLED LTPO 120Hz, sạc nhanh 90W.',
 '6.73 inch AMOLED LTPO 120Hz', 'Android 14 (HyperOS)', 'Snapdragon 8 Gen 3', '50MP (1 inch) + 50MP UW + 50MP 3.2x + 50MP 5x', '32MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

(6, 3, 'Xiaomi Redmi Note 13 Pro',
 'Redmi Note 13 Pro camera 200MP sắc nét, chip Helio G99-Ultra mượt mà, màn AMOLED 120Hz, pin 5000mAh sạc nhanh 67W. Siêu phẩm tầm trung.',
 '6.67 inch AMOLED 120Hz', 'Android 13 (MIUI 14)', 'MediaTek Helio G99-Ultra', '200MP + 8MP UW + 2MP macro', '16MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

-- OPPO
(7, 4, 'OPPO Find X7 Ultra',
 'OPPO Find X7 Ultra camera Hasselblad 4 cảm biến 50MP với zoom quang 6x, chip Snapdragon 8 Gen 3, màn AMOLED 120Hz, sạc siêu nhanh 100W.',
 '6.82 inch AMOLED LTPO 120Hz', 'Android 14 (ColorOS 14)', 'Snapdragon 8 Gen 3', '50MP + 50MP UW + 50MP 3x + 50MP 6x', '32MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

(8, 4, 'OPPO Reno12 Pro 5G',
 'OPPO Reno12 Pro 5G thiết kế siêu mỏng, chip Dimensity 7300-Energy AI, camera 50MP portrait, màn AMOLED 120Hz, sạc siêu nhanh 80W.',
 '6.7 inch AMOLED 120Hz', 'Android 14 (ColorOS 14)', 'MediaTek Dimensity 7300-Energy', '50MP + 8MP UW + 50MP tele 2x', '50MP AF', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

-- Realme
(9, 5, 'Realme GT 6',
 'Realme GT 6 hiệu năng flagship Snapdragon 8s Gen 3, màn AMOLED 120Hz, camera Sony 50MP, pin 5500mAh sạc siêu nhanh 120W. Gaming phone đỉnh cao.',
 '6.78 inch AMOLED 120Hz', 'Android 14 (Realme UI 5)', 'Snapdragon 8s Gen 3', '50MP Sony LYT-808 + 8MP UW + 50MP tele', '32MP', '5500mAh', '12 tháng chính hãng', 'ACTIVE'),

(10, 5, 'Realme 12 Pro+ 5G',
 'Realme 12 Pro+ 5G camera tele 64MP đầu tiên phân khúc, chip Snapdragon 7s Gen 2, màn AMOLED cong 120Hz, pin 5000mAh sạc 67W.',
 '6.7 inch AMOLED cong 120Hz', 'Android 14 (Realme UI 5)', 'Snapdragon 7s Gen 2', '50MP OIS + 8MP UW + 64MP tele 3x', '32MP', '5000mAh', '12 tháng chính hãng', 'ACTIVE'),

-- Vivo
(11, 6, 'Vivo X100 Pro',
 'Vivo X100 Pro camera ZEISS 1 inch, chip Dimensity 9300, màn AMOLED 120Hz, pin 5400mAh, sạc 100W. Đỉnh cao nhiếp ảnh di động.',
 '6.78 inch AMOLED LTPO 120Hz', 'Android 14 (Funtouch OS 14)', 'MediaTek Dimensity 9300', '50MP (1 inch) + 50MP UW + 50MP tele 4.3x', '32MP', '5400mAh', '12 tháng chính hãng', 'ACTIVE'),

(12, 6, 'Vivo V30 Pro 5G',
 'Vivo V30 Pro 5G với 3 camera 50MP ZEISS, đèn Aura Light chân dung, chip Dimensity 8200, màn AMOLED cong 120Hz, sạc 80W.',
 '6.78 inch AMOLED cong 120Hz', 'Android 14 (Funtouch OS 14)', 'MediaTek Dimensity 8200', '50MP OIS + 50MP UW + 50MP tele 2x', '50MP AF', '5000mAh', '12 tháng chính hãng', 'ACTIVE');

-- =========================
-- 3. PHONE_VARIANT (24 biến thể - mỗi phone 2 variant)
-- =========================
INSERT INTO `PHONE_VARIANT` (`ID`, `PHONE_ID`, `RAM`, `STORAGE`, `COLOR`, `PRICE`, `DISCOUNT_PRICE`, `STOCK_QUANTITY`, `SKU`, `STATUS`, `VERSION`) VALUES
-- iPhone 15 Pro Max
(1,  1,  '8GB',  '256GB', 'Titan Tự Nhiên',  34990000, 33990000, 25, 'IP15PM-256-TN', 'ACTIVE', 0),
(2,  1,  '8GB',  '512GB', 'Titan Xanh',       39990000, 38490000, 15, 'IP15PM-512-TX', 'ACTIVE', 0),
-- iPhone 15
(3,  2,  '6GB',  '128GB', 'Xanh Mint',        21990000, 20690000, 40, 'IP15-128-XM',   'ACTIVE', 0),
(4,  2,  '6GB',  '256GB', 'Hồng',             24990000, NULL,     30, 'IP15-256-H',    'ACTIVE', 0),
-- Galaxy S24 Ultra
(5,  3,  '12GB', '256GB', 'Titan Xám',        30990000, 29490000, 20, 'S24U-256-TX',   'ACTIVE', 0),
(6,  3,  '12GB', '512GB', 'Titan Đen',        34990000, NULL,     10, 'S24U-512-TD',   'ACTIVE', 0),
-- Galaxy A55
(7,  4,  '8GB',  '128GB', 'Xanh Navy',        8990000,  8490000,  50, 'GA55-128-XN',   'ACTIVE', 0),
(8,  4,  '8GB',  '256GB', 'Tím Lilac',        9990000,  NULL,     35, 'GA55-256-TL',   'ACTIVE', 0),
-- Xiaomi 14 Ultra
(9,  5,  '16GB', '512GB', 'Đen',              27990000, 26990000, 12, 'X14U-512-D',    'ACTIVE', 0),
(10, 5,  '16GB', '1TB',   'Trắng',            32990000, NULL,     5,  'X14U-1TB-T',    'ACTIVE', 0),
-- Redmi Note 13 Pro
(11, 6,  '8GB',  '256GB', 'Xanh Forest',      6490000,  5990000,  60, 'RN13P-256-XF',  'ACTIVE', 0),
(12, 6,  '12GB', '512GB', 'Đen Midnight',     7990000,  NULL,     40, 'RN13P-512-DM',  'ACTIVE', 0),
-- OPPO Find X7 Ultra
(13, 7,  '16GB', '256GB', 'Đen',              29990000, NULL,     8,  'FX7U-256-D',    'ACTIVE', 0),
(14, 7,  '16GB', '512GB', 'Nâu Da',           32990000, 31490000, 4,  'FX7U-512-ND',   'ACTIVE', 0),
-- OPPO Reno12 Pro
(15, 8,  '12GB', '256GB', 'Bạc',              10990000, 10490000, 30, 'OR12P-256-B',   'ACTIVE', 0),
(16, 8,  '12GB', '512GB', 'Tím',              12990000, NULL,     20, 'OR12P-512-T',   'ACTIVE', 0),
-- Realme GT 6
(17, 9,  '12GB', '256GB', 'Xanh Fluid',       13990000, 13190000, 18, 'RGT6-256-XF',   'ACTIVE', 0),
(18, 9,  '16GB', '512GB', 'Bạc',              15990000, NULL,     10, 'RGT6-512-B',    'ACTIVE', 0),
-- Realme 12 Pro+
(19, 10, '8GB',  '256GB', 'Be Submarine',     9490000,  8990000,  45, 'R12PP-256-BS',  'ACTIVE', 0),
(20, 10, '12GB', '256GB', 'Xanh Explorer',    10490000, NULL,     30, 'R12PP-256-XE',  'ACTIVE', 0),
-- Vivo X100 Pro
(21, 11, '16GB', '512GB', 'Đen Asteroid',     27990000, 26990000, 10, 'VX100P-512-DA', 'ACTIVE', 0),
(22, 11, '16GB', '1TB',   'Trắng',            31990000, NULL,     3,  'VX100P-1TB-T',  'ACTIVE', 0),
-- Vivo V30 Pro
(23, 12, '12GB', '256GB', 'Xanh Aqua',        11990000, 11490000, 35, 'VV30P-256-XA',  'ACTIVE', 0),
(24, 12, '12GB', '512GB', 'Đen',              13990000, NULL,     25, 'VV30P-512-D',   'ACTIVE', 0);

-- =========================
-- 4. PHONE_IMAGE (2-3 ảnh/phone — ảnh thật từ Google/official)
-- =========================
INSERT INTO `PHONE_IMAGE` (`ID`, `PHONE_ID`, `IMAGE_URL`, `IS_MAIN`) VALUES
-- iPhone 15 Pro Max
(1,  1,  'https://store.storeimages.cdn-apple.com/8756/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=1200&hei=630&fmt=jpeg&qlt=95', TRUE),
(2,  1,  'https://store.storeimages.cdn-apple.com/8756/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-bluetitanium?wid=1200&hei=630&fmt=jpeg&qlt=95', FALSE),
-- iPhone 15
(3,  2,  'https://store.storeimages.cdn-apple.com/8756/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-green?wid=1200&hei=630&fmt=jpeg&qlt=95', TRUE),
(4,  2,  'https://store.storeimages.cdn-apple.com/8756/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=1200&hei=630&fmt=jpeg&qlt=95', FALSE),
-- Galaxy S24 Ultra
(5,  3,  'https://images.samsung.com/is/image/samsung/p6pim/vn/2401/gallery/vn-galaxy-s24-s928-sm-s928bztcxxv-539573869?$684_547_PNG$', TRUE),
(6,  3,  'https://images.samsung.com/is/image/samsung/p6pim/vn/2401/gallery/vn-galaxy-s24-s928-sm-s928bzscxxv-539573870?$684_547_PNG$', FALSE),
-- Galaxy A55
(7,  4,  'https://images.samsung.com/is/image/samsung/p6pim/vn/sm-a556elbexxv/gallery/vn-galaxy-a55-5g-sm-a556-sm-a556elbexxv-543424270?$684_547_PNG$', TRUE),
(8,  4,  'https://images.samsung.com/is/image/samsung/p6pim/vn/sm-a556elbexxv/gallery/vn-galaxy-a55-5g-sm-a556-sm-a556elbexxv-543424271?$684_547_PNG$', FALSE),
-- Xiaomi 14 Ultra
(9,  5,  'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi-14-ultra/specs-header.png', TRUE),
(10, 5,  'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi-14-ultra/gallery-black.png', FALSE),
-- Redmi Note 13 Pro
(11, 6,  'https://i01.appmifile.com/webfile/globalimg/products/pc/redmi-note-13-pro/specs-header.png', TRUE),
(12, 6,  'https://i01.appmifile.com/webfile/globalimg/products/pc/redmi-note-13-pro/gallery-green.png', FALSE),
-- OPPO Find X7 Ultra
(13, 7,  'https://image.oppo.com/content/dam/oppo/common/mkt/v2-2/find-x7-ultra/listpage/findx7-ultra-brown-listpage-600.png', TRUE),
(14, 7,  'https://image.oppo.com/content/dam/oppo/common/mkt/v2-2/find-x7-ultra/listpage/findx7-ultra-black-listpage-600.png', FALSE),
-- OPPO Reno12 Pro
(15, 8,  'https://image.oppo.com/content/dam/oppo/common/mkt/v2-2/reno12-pro/listpage/reno12-pro-silver-listpage-600.png', TRUE),
(16, 8,  'https://image.oppo.com/content/dam/oppo/common/mkt/v2-2/reno12-pro/listpage/reno12-pro-purple-listpage-600.png', FALSE),
-- Realme GT 6
(17, 9,  'https://image.realme.net/vn/other/r-gt6-green.png', TRUE),
(18, 9,  'https://image.realme.net/vn/other/r-gt6-silver.png', FALSE),
-- Realme 12 Pro+
(19, 10, 'https://image.realme.net/vn/other/r-12-pro-plus-beige.png', TRUE),
(20, 10, 'https://image.realme.net/vn/other/r-12-pro-plus-blue.png', FALSE),
-- Vivo X100 Pro
(21, 11, 'https://www.vivo.com/vn/products/param/vivo-x100-pro-black.png', TRUE),
(22, 11, 'https://www.vivo.com/vn/products/param/vivo-x100-pro-white.png', FALSE),
-- Vivo V30 Pro
(23, 12, 'https://www.vivo.com/vn/products/param/vivo-v30-pro-aqua.png', TRUE),
(24, 12, 'https://www.vivo.com/vn/products/param/vivo-v30-pro-black.png', FALSE);

-- =========================
-- 5. USERS (1 admin + 4 khách)
-- Mật khẩu (dùng chung cho tất cả user): password123
-- Riêng admin: admin123
-- Hash tạo bằng: bcryptjs.genSaltSync(10)
-- =========================
INSERT INTO `USERS` (`ID`, `FULL_NAME`, `EMAIL`, `PASSWORD`, `PHONE`, `ADDRESS`, `ROLE_ID`, `STATUS`) VALUES
(1, 'Admin GreenPhone',  'admin@greenphone.vn',   '$2b$10$DF8Tnxl1d/r4r.n2fd1pp.oda767B1DhAm3VbJVN79qligqrdAvya', '0900000000', 'Tầng 5, Tòa nhà Green, 123 Nguyễn Huệ, Quận 1, TP.HCM',       2, 'ACTIVE'),
(2, 'Nguyễn Văn An',    'an.nguyen@example.com',  '$2b$10$nbNgyEsZW..K5F.t1xqBouFddOCsb60.GW3t06muUQxkIXMC7xWMa', '0912345678', '15A Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',           1, 'ACTIVE'),
(3, 'Trần Thị Bình',    'binh.tran@example.com',  '$2b$10$nbNgyEsZW..K5F.t1xqBouFddOCsb60.GW3t06muUQxkIXMC7xWMa', '0923456789', '22B Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM',             1, 'ACTIVE'),
(4, 'Lê Văn Cường',     'cuong.le@example.com',   '$2b$10$nbNgyEsZW..K5F.t1xqBouFddOCsb60.GW3t06muUQxkIXMC7xWMa', '0934567890', '78 Đường Cách Mạng Tháng 8, Phường 5, Quận 3, TP.HCM',        1, 'ACTIVE'),
(5, 'Phạm Thị Dung',    'dung.pham@example.com',  '$2b$10$nbNgyEsZW..K5F.t1xqBouFddOCsb60.GW3t06muUQxkIXMC7xWMa', '0945678901', '45 Trần Hưng Đạo, Phường Cửa Nam, Quận Hoàn Kiếm, Hà Nội',   1, 'ACTIVE');

-- =========================
-- 6. CART (mỗi khách 1 giỏ hàng)
-- =========================
INSERT INTO `CART` (`ID`, `USER_ID`) VALUES
(1, 2),
(2, 3),
(3, 4),
(4, 5);

-- =========================
-- 7. CART_ITEM (vài món trong giỏ)
-- =========================
INSERT INTO `CART_ITEM` (`CART_ID`, `PHONE_VARIANT_ID`, `QUANTITY`) VALUES
(1, 1, 1),   -- An muốn mua iPhone 15 Pro Max 256GB
(1, 7, 2),   -- An cũng muốn 2 Galaxy A55
(2, 3, 1),   -- Bình muốn iPhone 15 128GB
(3, 11, 1);  -- Cường muốn Redmi Note 13 Pro

-- =========================
-- 8. PROMOTION (4 mã khuyến mãi)
-- =========================
INSERT INTO `PROMOTION` (`ID`, `CODE`, `NAME`, `DESCRIPTION`, `DISCOUNT_TYPE`, `DISCOUNT_VALUE`, `MAX_DISCOUNT_AMOUNT`, `MIN_ORDER_VALUE`, `QUANTITY`, `CLAIMED_QUANTITY`, `USED_QUANTITY`, `START_DATE`, `END_DATE`, `STATUS`) VALUES
(1, 'CHAOMUNG',   'Chào mừng thành viên mới',  'Giảm 10% cho đơn hàng đầu tiên, tối đa 500K',                 'PERCENT', 10.00, 500000.00,  1000000.00,  100, 45, 20, '2026-06-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE'),
(2, 'HOT200',     'Giảm ngay 200K',            'Giảm 200.000đ cho đơn hàng từ 5 triệu',                       'FIXED',  200000.00, NULL,     5000000.00,  200, 120, 85, '2026-07-01 00:00:00', '2026-08-31 23:59:59', 'ACTIVE'),
(3, 'SUMMER500',  'Sale hè bùng nổ',           'Giảm 500.000đ cho đơn từ 15 triệu, áp dụng toàn bộ sản phẩm', 'FIXED',  500000.00, NULL,    15000000.00,  50,  30,  12, '2026-07-01 00:00:00', '2026-07-31 23:59:59', 'ACTIVE'),
(4, 'TET2026',    'Ưu đãi Tết 2026',           'Giảm 20% tối đa 1 triệu đồng, đã hết hạn',                    'PERCENT', 20.00, 1000000.00, 2000000.00,  300, 300, 280, '2026-01-15 00:00:00', '2026-02-15 23:59:59', 'ACTIVE');

-- =========================
-- 9. USER_PROMOTION (gán KM cho user)
-- =========================
INSERT INTO `USER_PROMOTION` (`ID`, `USER_ID`, `PROMOTION_ID`, `STATUS`) VALUES
(1, 2, 1, 'AVAILABLE'),
(2, 2, 2, 'AVAILABLE'),
(3, 3, 1, 'AVAILABLE'),
(4, 3, 3, 'AVAILABLE'),
(5, 4, 2, 'USED'),      -- Cường đã dùng HOT200
(6, 5, 1, 'AVAILABLE'),
(7, 5, 4, 'USED');      -- Dung đã dùng TET2026

-- =========================
-- 10. ORDERS (3 đơn hàng mẫu ở nhiều trạng thái)
-- =========================

-- Đơn 1: An mua iPhone 15 Pro Max — PENDING
INSERT INTO `ORDERS` (`ID`, `USER_ID`, `USER_PROMOTION_ID`, `RECEIVER_NAME`, `RECEIVER_PHONE`, `SHIPPING_ADDRESS`, `TOTAL_AMOUNT`, `DISCOUNT_AMOUNT`, `FINAL_AMOUNT`, `ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `NOTE`, `CREATED_AT`) VALUES
(1, 2, 2, 'Nguyễn Văn An', '0912345678', '15A Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
 33990000.00, 200000.00, 33790000.00, 'PENDING', 'UNPAID', 'VIETQR', 'Giao hàng giờ hành chính', '2026-07-10 09:30:00');

-- Đơn 2: Bình mua iPhone 15 + Galaxy A55 — CONFIRMED
INSERT INTO `ORDERS` (`ID`, `USER_ID`, `USER_PROMOTION_ID`, `RECEIVER_NAME`, `RECEIVER_PHONE`, `SHIPPING_ADDRESS`, `TOTAL_AMOUNT`, `DISCOUNT_AMOUNT`, `FINAL_AMOUNT`, `ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `CREATED_AT`) VALUES
(2, 3, 3, 'Trần Thị Bình', '0923456789', '22B Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM',
 29180000.00, 500000.00, 28680000.00, 'CONFIRMED', 'PAID', 'VIETQR', '2026-07-08 14:20:00');

-- Đơn 3: Cường mua Redmi Note 13 Pro (đã dùng HOT200) — DELIVERED
INSERT INTO `ORDERS` (`ID`, `USER_ID`, `USER_PROMOTION_ID`, `RECEIVER_NAME`, `RECEIVER_PHONE`, `SHIPPING_ADDRESS`, `TOTAL_AMOUNT`, `DISCOUNT_AMOUNT`, `FINAL_AMOUNT`, `ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `CREATED_AT`) VALUES
(3, 4, 5, 'Lê Văn Cường', '0934567890', '78 Đường Cách Mạng Tháng 8, Phường 5, Quận 3, TP.HCM',
 5990000.00, 200000.00, 5790000.00, 'DELIVERED', 'PAID', 'COD', '2026-07-01 08:00:00');

-- =========================
-- 11. ORDER_DETAIL (chi tiết từng đơn)
-- =========================

-- Đơn 1: 1 iPhone 15 Pro Max 256GB
INSERT INTO `ORDER_DETAIL` (`ID`, `ORDER_ID`, `PHONE_VARIANT_ID`, `PRODUCT_NAME`, `RAM`, `STORAGE`, `COLOR`, `UNIT_PRICE`, `QUANTITY`, `SUBTOTAL`) VALUES
(1, 1, 1, 'iPhone 15 Pro Max', '8GB', '256GB', 'Titan Tự Nhiên', 33990000.00, 1, 33990000.00);

-- Đơn 2: 1 iPhone 15 128GB + 1 Galaxy A55 128GB
INSERT INTO `ORDER_DETAIL` (`ID`, `ORDER_ID`, `PHONE_VARIANT_ID`, `PRODUCT_NAME`, `RAM`, `STORAGE`, `COLOR`, `UNIT_PRICE`, `QUANTITY`, `SUBTOTAL`) VALUES
(2, 2, 3, 'iPhone 15',             '6GB',  '128GB', 'Xanh Mint', 20690000.00, 1, 20690000.00),
(3, 2, 7, 'Samsung Galaxy A55 5G', '8GB',  '128GB', 'Xanh Navy', 8490000.00,  1, 8490000.00);

-- Đơn 3: 1 Redmi Note 13 Pro 256GB
INSERT INTO `ORDER_DETAIL` (`ID`, `ORDER_ID`, `PHONE_VARIANT_ID`, `PRODUCT_NAME`, `RAM`, `STORAGE`, `COLOR`, `UNIT_PRICE`, `QUANTITY`, `SUBTOTAL`) VALUES
(4, 3, 11, 'Xiaomi Redmi Note 13 Pro', '8GB', '256GB', 'Xanh Forest', 5990000.00, 1, 5990000.00);

-- =========================
-- 12. PAYMENT (thanh toán)
-- =========================
INSERT INTO `PAYMENT` (`ID`, `ORDER_ID`, `PAYMENT_METHOD`, `PAYMENT_PROVIDER`, `TRANSACTION_CODE`, `AMOUNT`, `STATUS`, `PAID_AT`) VALUES
(1, 1, 'VIETQR', 'SEPAY', NULL,              33790000.00, 'PENDING', NULL),
(2, 2, 'VIETQR', 'SEPAY', 'SEPAY-TX-000002', 28680000.00, 'PAID',    '2026-07-08 14:25:00'),
(3, 3, 'COD',    NULL,    'COD-TX-000003',    5790000.00,  'PAID',    '2026-07-03 10:00:00');

-- =========================
-- 13. REVIEW (5 đánh giá cho đơn đã giao)
-- =========================
INSERT INTO `REVIEW` (`ID`, `USER_ID`, `PHONE_ID`, `ORDER_DETAIL_ID`, `RATING`, `CONTENT`, `STATUS`) VALUES
-- Cường review Redmi Note 13 Pro (đơn đã DELIVERED)
(1, 4, 6, 4, 5, 'Điện thoại quá ngon trong tầm giá! Camera 200MP chụp sắc nét, pin dùng 2 ngày mới hết. Màn hình AMOLED đẹp xuất sắc. Rất đáng mua!', 'SHOW'),

-- Bình review iPhone 15 (đơn đã CONFIRMED - xem như đã giao)
(2, 3, 2, 2, 5, 'iPhone 15 đúng chất Apple! Mượt mà, camera đẹp, pin dùng cả ngày. Dynamic Island rất tiện. Màu xanh mint siêu xinh!', 'SHOW'),

-- Bình review Galaxy A55 (đơn đã CONFIRMED)
(3, 3, 4, 3, 4, 'Galaxy A55 pin trâu, màn hình đẹp. Chụp ảnh tốt trong tầm giá. Hơi tiếc là viền màn hình vẫn còn hơi dày.', 'SHOW'),

-- An review iPhone 15 Pro Max (đơn PENDING — bug FINDING-03: cho review khi chưa nhận hàng)
-- (Đây là lỗi đã ghi nhận trong BUG_REPORT: ReviewService không check order status DELIVERED)
(4, 2, 1, 1, 5, 'Mới đặt hàng hôm qua, chưa nhận được máy nhưng rất háo hức! Sẽ cập nhật sau khi nhận hàng.', 'SHOW'),

-- Cường review thêm cho iPhone 15 (giả lập mua cũ)
(5, 4, 2, 4, 4, 'Từng dùng iPhone 15 trước khi đổi sang Redmi. Máy ổn, iOS mượt nhưng pin hơi yếu.', 'SHOW');

-- =========================
-- 14. BANNER (3 banner trang chủ)
-- =========================
INSERT INTO `BANNER` (`ID`, `TITLE`, `IMAGE_URL`, `LINK_URL`, `STATUS`) VALUES
(1, 'Sale hè bùng nổ - Giảm đến 3 triệu',
 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1200&h=400&fit=crop',
 '/san-pham?sort=discount', 'ACTIVE'),

(2, 'iPhone 15 Series - Trả góp 0%',
 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&h=400&fit=crop',
 '/san-pham?brand=1', 'ACTIVE'),

(3, 'Samsung Galaxy S24 Ultra - AI đột phá',
 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200&h=400&fit=crop',
 '/san-pham/3', 'ACTIVE');
