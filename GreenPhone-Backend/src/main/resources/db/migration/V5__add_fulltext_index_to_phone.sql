-- V5: Add Full-Text index on phone table for fast full-text searching
CREATE FULLTEXT INDEX `idx_phone_fulltext` ON `phone` (`NAME`, `DESCRIPTION`);
