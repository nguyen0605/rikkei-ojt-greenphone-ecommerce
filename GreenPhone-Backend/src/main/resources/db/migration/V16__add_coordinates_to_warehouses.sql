-- V16: Add latitude and longitude to warehouse for geographic distance calculation and warehouse routing engine
ALTER TABLE `warehouse`
    ADD COLUMN `latitude` DECIMAL(10, 8) NULL AFTER `address`,
    ADD COLUMN `longitude` DECIMAL(11, 8) NULL AFTER `latitude`;

-- Set confirmed physical coordinates for initial active warehouses
-- WH-HN-MAIN: Hanoi central / Cau Giay warehouse (21.0285°N, 105.8542°E)
-- WH-HCM-Q1: Ho Chi Minh City District 1 warehouse (10.7769°N, 106.7009°E)
UPDATE `warehouse` SET `latitude` = 21.02850000, `longitude` = 105.85420000 WHERE `code` = 'WH-HN-MAIN';
UPDATE `warehouse` SET `latitude` = 10.77690000, `longitude` = 106.70090000 WHERE `code` = 'WH-HCM-Q1';

