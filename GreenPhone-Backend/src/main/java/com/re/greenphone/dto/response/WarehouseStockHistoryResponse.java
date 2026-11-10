package com.re.greenphone.dto.response;
import java.time.LocalDateTime;
public record WarehouseStockHistoryResponse(Long id, Long variantId, String sku, String changeType,
        int quantityBefore, int quantityChange, int quantityAfter, String reason, String changedByName,
        String transferReference, LocalDateTime createdAt) { }
