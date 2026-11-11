package com.re.greenphone.dto.response;
public record WarehouseStockResponse(Long warehouseId, String warehouseCode, String warehouseName, String warehouseStatus,
        Long variantId, Long phoneId, String productName, String sku, String ram, String storage, String color,
        int quantity, int aggregateQuantity) { }
