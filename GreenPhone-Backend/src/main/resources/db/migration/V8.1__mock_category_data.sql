-- Migration V8.1: Update brand logos and catalog category images with Cloudflare R2
-- Module: CAT (Catalog & Products) - Task CAT-18

UPDATE `brand` SET `LOGO_URL` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/google-pixel.svg', `UPDATED_AT` = NOW() WHERE `NAME` = 'Google Pixel';
UPDATE `brand` SET `LOGO_URL` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/asus.svg', `UPDATED_AT` = NOW() WHERE `NAME` = 'ASUS';
UPDATE `brand` SET `LOGO_URL` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/oneplus.svg', `UPDATED_AT` = NOW() WHERE `NAME` = 'OnePlus';
UPDATE `brand` SET `LOGO_URL` = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/sony.svg', `UPDATED_AT` = NOW() WHERE `NAME` = 'Sony';
