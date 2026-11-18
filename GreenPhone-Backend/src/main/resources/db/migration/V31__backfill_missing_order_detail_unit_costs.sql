-- ====================================================================================
-- Migration: V31__backfill_missing_order_detail_unit_costs.sql
-- Description: Bo sung gia von (unit_cost) cho cac ban ghi order_detail con thieu
--              (unit_cost IS NULL), dam bao tinh toan day du COGS, loi nhuan gop va
--              bien loi nhuan tren Admin Dashboard ma khong lam mat tinh toan ven du lieu.
-- ====================================================================================

-- 1. Cap nhat gia von binh quan gia quyen tu cac Don Nhap Hang (PO) da nhan hang (RECEIVED)
-- Ap dung cong thuc: SUM(unit_cost * quantity_received) / SUM(quantity_received)
UPDATE `order_detail` od
JOIN (
    SELECT 
        poi.phone_variant_id,
        ROUND(SUM(poi.unit_cost * poi.quantity_received) / SUM(poi.quantity_received), 6) AS calculated_cost
    FROM `purchase_order_item` poi
    JOIN `purchase_order` po ON poi.po_id = po.id
    WHERE po.status = 'RECEIVED' AND poi.quantity_received > 0
    GROUP BY poi.phone_variant_id
) cost ON od.phone_variant_id = cost.phone_variant_id
SET od.unit_cost = cost.calculated_cost
WHERE od.unit_cost IS NULL;

-- 2. Cap nhat gia von du phong cho cac san pham lich su / mau seed chua tung lap PO nhap hang
-- Quy uoc ty suat bien loi nhuan gop tieu chuan cho nganh dien thoai / ban le cong nghe (~25%)
-- Gia von du phong = 75% don gia ban niem yet tai thoi diem dat hang (unit_price * 0.75)
UPDATE `order_detail`
SET `unit_cost` = ROUND(`unit_price` * 0.750000, 6)
WHERE `unit_cost` IS NULL 
  AND `unit_price` IS NOT NULL 
  AND `unit_price` > 0;

-- 3. Xu ly cac truong hop dac biet (don gia ban <= 0 hoac qua tang kem khong thu phi)
UPDATE `order_detail`
SET `unit_cost` = 0.000000
WHERE `unit_cost` IS NULL;
