package com.re.greenphone.mapper;
import com.re.greenphone.entity.*;
import com.re.greenphone.dto.response.*;
import org.mapstruct.*;
@Mapper(componentModel="spring", unmappedTargetPolicy=ReportingPolicy.ERROR)
public interface ProcurementMapper {
    SupplierResponse toResponse(Supplier supplier);
    @Mapping(target="supplierId", source="supplier.id")
    @Mapping(target="supplierName", source="supplier.name")
    @Mapping(target="warehouseId", source="warehouse.id")
    @Mapping(target="warehouseName", source="warehouse.name")
    PurchaseOrderResponse toResponse(PurchaseOrder order);
    @Mapping(target="variantId", source="phoneVariant.id")
    @Mapping(target="sku", source="phoneVariant.sku")
    PurchaseOrderResponse.Item toResponse(PurchaseOrderItem item);
}
