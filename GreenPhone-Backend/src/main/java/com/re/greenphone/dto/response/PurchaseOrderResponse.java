package com.re.greenphone.dto.response;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
public record PurchaseOrderResponse(Long id,String poNumber,Long supplierId,String supplierName,Long warehouseId,String warehouseName,
    String status,BigDecimal totalCost,String note,LocalDateTime createdAt,LocalDateTime updatedAt,List<Item> items) {
    public record Item(Long id,Long variantId,String sku,Integer quantityOrdered,Integer quantityReceived,BigDecimal unitCost) {}
}
