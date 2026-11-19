-- Migration V32: Update and standardize all brand logos to secure Cloudflare R2
-- Module: CAT (Catalog & Products)
-- Fixes broken logo URLs (ASUS, OnePlus) and migrates all brand logos to official R2 object storage bucket

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/Apple.webp',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'apple';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/samsung.avif',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'samsung';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/Xiaomi.webp',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'xiaomi';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/OPPO.webp',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'oppo';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/ASUS_Logo_1.png',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'asus';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/oneplus.svg.webp',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'oneplus';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/google-pixel.svg',
    `updated_at` = NOW()
WHERE LOWER(`name`) LIKE '%google%';

UPDATE `brand`
SET `logo_url` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/sony.svg',
    `updated_at` = NOW()
WHERE LOWER(`name`) = 'sony';
