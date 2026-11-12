-- Migration V22: Seed missing variant and image for OPPO A78 (ID: 130)
-- Module: CAT (Catalog & Products)

INSERT INTO `phone_image` (`PHONE_ID`, `IMAGE_URL`, `IS_MAIN`, `SORT_ORDER`, `CREATED_AT`, `UPDATED_AT`)
VALUES (
    130,
    'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/products/oppo-a78.png',
    1,
    0,
    NOW(),
    NOW()
);

INSERT INTO `phone_variant` (`PHONE_ID`, `RAM_ITEM_ID`, `STORAGE_ITEM_ID`, `COLOR_ITEM_ID`, `PRICE`, `DISCOUNT_PRICE`, `STOCK_QUANTITY`, `SKU`, `STATUS`, `VERSION`, `CREATED_AT`, `UPDATED_AT`)
VALUES (
    130,
    (SELECT `ID` FROM `option_item` WHERE `OPTION_ID` = 1 AND (`VALUE` = '8GB' OR `VALUE` LIKE '8%') LIMIT 1),
    (SELECT `ID` FROM `option_item` WHERE `OPTION_ID` = 2 AND (`VALUE` = '256GB' OR `VALUE` LIKE '256%') LIMIT 1),
    (SELECT `ID` FROM `option_item` WHERE `OPTION_ID` = 4 AND (`VALUE` LIKE '%Xanh%' OR `VALUE` = 'blue') LIMIT 1),
    6490000,
    5490000,
    50,
    'PHONE-OPPO-A78-256GB',
    'ACTIVE',
    0,
    NOW(),
    NOW()
);
