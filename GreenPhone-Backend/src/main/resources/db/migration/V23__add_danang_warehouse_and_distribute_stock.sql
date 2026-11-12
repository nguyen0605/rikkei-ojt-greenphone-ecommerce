-- V20: Add Da Nang warehouse and balance inventory distribution across 3 regions (HN, HCM, DN)
-- Task: [INV-09] Phân bổ cân bằng tồn kho 3 miền

-- 1. Create or activate Da Nang warehouse (WH-DN-HAI)
INSERT INTO `warehouse` (`code`, `name`, `address`, `latitude`, `longitude`, `status`, `created_at`)
SELECT 'WH-DN-HAI', 'Kho Chi Nhánh Đà Nẵng', 'Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng', 16.05440000, 108.20220000, 'ACTIVE', CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM `warehouse` WHERE `code` = 'WH-DN-HAI');

UPDATE `warehouse`
SET `name` = 'Kho Chi Nhánh Đà Nẵng',
    `address` = 'Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng',
    `latitude` = 16.05440000,
    `longitude` = 108.20220000,
    `status` = 'ACTIVE'
WHERE `code` = 'WH-DN-HAI';

-- Ensure WH-HN-MAIN and WH-HCM-Q1 are active
UPDATE `warehouse` SET `status` = 'ACTIVE' WHERE `code` IN ('WH-HN-MAIN', 'WH-HCM-Q1');

-- 2. Backfill any newly added variant to WH-HN-MAIN if it has no warehouse_stock rows at all
INSERT INTO `warehouse_stock` (`warehouse_id`, `phone_variant_id`, `quantity`, `created_at`)
SELECT (SELECT id FROM `warehouse` WHERE `code` = 'WH-HN-MAIN'), v.id, v.stock_quantity, CURRENT_TIMESTAMP(6)
FROM `phone_variant` v
WHERE NOT EXISTS (
    SELECT 1 FROM `warehouse_stock` ws WHERE ws.phone_variant_id = v.id
);

-- 3. Data integrity validation before reallocation:
-- Verify that total quantity across all warehouses equals phone_variant.stock_quantity for every variant.
-- If any discrepancy is found, abort migration immediately.
SET @stock_mismatch_count = (
    SELECT COUNT(*) FROM (
        SELECT v.id
        FROM `phone_variant` v
        LEFT JOIN `warehouse_stock` ws ON ws.phone_variant_id = v.id
        GROUP BY v.id, v.stock_quantity
        HAVING v.stock_quantity <> COALESCE(SUM(ws.quantity), 0)
    ) AS mismatches
);

SELECT CASE
    WHEN @stock_mismatch_count > 0 THEN (SELECT 'ERROR: warehouse stock sum does not equal phone_variant.stock_quantity before V20 migration' UNION SELECT 'ABORT_MIGRATION')
    ELSE 'STOCK_INTEGRITY_VERIFIED'
END INTO @stock_check_status;

-- 4. Ensure warehouse_stock record exists for each of the 3 warehouses for every variant (with 0 quantity if missing)
INSERT INTO `warehouse_stock` (`warehouse_id`, `phone_variant_id`, `quantity`, `created_at`)
SELECT w.id, v.id, 0, CURRENT_TIMESTAMP(6)
FROM `warehouse` w
CROSS JOIN `phone_variant` v
WHERE w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI')
  AND NOT EXISTS (
      SELECT 1 FROM `warehouse_stock` ws
      WHERE ws.warehouse_id = w.id AND ws.phone_variant_id = v.id
  );

-- 5. Record warehouse_stock_history for reallocation (only for non-zero quantity changes and not yet recorded for INV-09)
INSERT INTO `warehouse_stock_history` (
    `warehouse_id`,
    `phone_variant_id`,
    `change_type`,
    `quantity_before`,
    `quantity_change`,
    `quantity_after`,
    `reason`,
    `changed_by_name`,
    `created_at`
)
SELECT
    ws.warehouse_id,
    ws.phone_variant_id,
    'OPENING',
    ws.quantity AS quantity_before,
    (CASE
        WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END
        WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END
        WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3)
    END) - ws.quantity AS quantity_change,
    (CASE
        WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END
        WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END
        WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3)
    END) AS quantity_after,
    'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)',
    'SYSTEM',
    CURRENT_TIMESTAMP(6)
FROM `warehouse_stock` ws
JOIN `warehouse` w ON w.id = ws.warehouse_id
JOIN `phone_variant` v ON v.id = ws.phone_variant_id
WHERE w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI')
  AND ((CASE
        WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END
        WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END
        WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3)
    END) - ws.quantity) <> 0
  AND NOT EXISTS (
      SELECT 1 FROM `warehouse_stock_history` wsh
      WHERE wsh.warehouse_id = ws.warehouse_id
        AND wsh.phone_variant_id = ws.phone_variant_id
        AND wsh.reason = 'Phân bổ ban đầu cân bằng tồn kho 3 miền (INV-09)'
  );

-- 6. Update warehouse_stock to target balanced quantities
UPDATE `warehouse_stock` ws
JOIN `warehouse` w ON w.id = ws.warehouse_id
JOIN `phone_variant` v ON v.id = ws.phone_variant_id
SET ws.quantity = CASE
        WHEN w.code = 'WH-HN-MAIN' THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) >= 1 THEN 1 ELSE 0 END
        WHEN w.code = 'WH-HCM-Q1'  THEN (v.stock_quantity DIV 3) + CASE WHEN (v.stock_quantity % 3) = 2  THEN 1 ELSE 0 END
        WHEN w.code = 'WH-DN-HAI'  THEN (v.stock_quantity DIV 3)
    END,
    ws.updated_at = CURRENT_TIMESTAMP(6)
WHERE w.code IN ('WH-HN-MAIN', 'WH-HCM-Q1', 'WH-DN-HAI');
