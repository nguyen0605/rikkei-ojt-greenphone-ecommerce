-- V4: Add sort_order and position columns to banner table
ALTER TABLE `banner`
    ADD COLUMN `SORT_ORDER` int NOT NULL DEFAULT 0,
    ADD COLUMN `POSITION` varchar(50) NOT NULL DEFAULT 'HERO';
