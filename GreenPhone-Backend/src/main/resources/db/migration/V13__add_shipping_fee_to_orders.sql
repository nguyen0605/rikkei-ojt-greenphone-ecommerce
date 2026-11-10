-- =============================================================================
-- Migration V9: Add shipping_fee column to orders table and backfill historical data
-- =============================================================================

ALTER TABLE `orders` 
ADD COLUMN `shipping_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `discount_amount`;

-- Backfill shipping_fee for existing historical orders where final_amount > (total_amount - discount_amount)
UPDATE `orders` 
SET `shipping_fee` = GREATEST(0.00, `final_amount` - (`total_amount` - `discount_amount`))
WHERE `final_amount` > (`total_amount` - `discount_amount`);

