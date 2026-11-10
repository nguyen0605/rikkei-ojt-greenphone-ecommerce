package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.*;
import com.re.greenphone.dto.request.*;
import com.re.greenphone.dto.response.*;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Transactional
public class WarehouseInventoryService {
    private final WarehouseStockLedgerService ledger;
    private final InventoryStockHistoryService globalHistory;
    private final PhoneVariantRepository variants;
    private final WarehouseStockRepository stocks;
    private final WarehouseRepository warehouses;
    private final WarehouseStockHistoryRepository history;

    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> stock(Long warehouseId) {
        ledger.warehouse(warehouseId);
        return stocks.findByWarehouseIdOrderByIdAsc(warehouseId).stream()
                .map(stock -> dto(stock.getWarehouse(), stock.getPhoneVariant(), stock.getQuantity())).toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> distribution(Long variantId) {
        PhoneVariant variant = variants.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));
        Map<Long, Integer> quantities = stocks.findByPhoneVariantId(variantId).stream()
                .collect(Collectors.toMap(stock -> stock.getWarehouse().getId(), WarehouseStock::getQuantity));
        return warehouses.findAll(Sort.by("id")).stream()
                .map(warehouse -> dto(warehouse, variant, quantities.getOrDefault(warehouse.getId(), 0))).toList();
    }

    public PhoneVariant movement(Long warehouseId, WarehouseMovementRequest request) {
        validate(request.quantity(), request.reason());
        if (!List.of("IMPORT", "EXPORT").contains(request.changeType())) throw new BadRequestException("Invalid movement type");
        PhoneVariant variant = lock(request.variantId());
        ledger.activeWarehouse(warehouseId);
        int before = variant.getStockQuantity();
        int delta = "IMPORT".equals(request.changeType()) ? request.quantity() : -request.quantity();
        final int after;
        try { after = Math.addExact(before, delta); }
        catch (ArithmeticException ex) { throw new BadRequestException("Stock quantity overflow"); }
        if (after < 0) throw new BadRequestException("Insufficient aggregate stock");
        globalHistory.recordAtWarehouse(variant, before, delta, request.changeType(), request.reason().strip(), warehouseId);
        variant.setStockQuantity(after);
        return variants.save(variant);
    }

    public PhoneVariant transfer(Long sourceId, WarehouseTransferRequest request) {
        validate(request.quantity(), request.reason());
        if (sourceId.equals(request.targetWarehouseId())) throw new BadRequestException("Source and target must differ");
        PhoneVariant variant = lock(request.variantId());
        Warehouse source = ledger.activeWarehouse(sourceId);
        Warehouse target = ledger.activeWarehouse(request.targetWarehouseId());
        int total = variant.getStockQuantity();
        String reference = UUID.randomUUID().toString();
        ledger.apply(variant, source, total, -request.quantity(), "TRANSFER_OUT", request.reason().strip(), reference);
        ledger.apply(variant, target, total, request.quantity(), "TRANSFER_IN", request.reason().strip(), reference);
        String reason = "Transfer " + source.getCode() + " -> " + target.getCode() + ": " + request.reason().strip();
        globalHistory.record(variant, total, 0, "ADJUSTMENT", reason.substring(0, Math.min(255, reason.length())));
        return variant;
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockHistoryResponse> history(Long warehouseId, Long variantId) {
        ledger.warehouse(warehouseId);
        var page = PageRequest.of(0, 100);
        var entries = variantId == null ? history.findByWarehouseIdOrderByCreatedAtDescIdDesc(warehouseId, page)
                : history.findByWarehouseIdAndPhoneVariantIdOrderByCreatedAtDescIdDesc(warehouseId, variantId, page);
        return entries.stream().map(entry -> new WarehouseStockHistoryResponse(entry.getId(), entry.getPhoneVariant().getId(),
                entry.getPhoneVariant().getSku(), entry.getChangeType(), entry.getQuantityBefore(), entry.getQuantityChange(),
                entry.getQuantityAfter(), entry.getReason(), entry.getChangedByName(), entry.getTransferReference(), entry.getCreatedAt())).toList();
    }

    private PhoneVariant lock(Long id) {
        return variants.findByIdWithLock(id).orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", id));
    }
    private void validate(int quantity, String reason) {
        if (quantity <= 0 || reason == null || reason.isBlank() || reason.length() > 255) throw new BadRequestException("Invalid quantity or reason");
    }
    private WarehouseStockResponse dto(Warehouse warehouse, PhoneVariant variant, int quantity) {
        return new WarehouseStockResponse(warehouse.getId(), warehouse.getCode(), warehouse.getName(), warehouse.getStatus(),
                variant.getId(), variant.getPhone().getId(), variant.getPhone().getName(), variant.getSku(),
                variant.getRamItem().getValue(), variant.getStorageItem().getValue(), variant.getColorItem().getValue(),
                quantity, variant.getStockQuantity());
    }
}
