package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.*;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Every writer must hold the PhoneVariant pessimistic lock before touching allocations. */
@Service @RequiredArgsConstructor @Transactional
public class WarehouseStockLedgerService {
    public static final String MAIN_CODE = "WH-HN-MAIN";
    private final WarehouseRepository warehouses;
    private final WarehouseStockRepository stocks;
    private final WarehouseStockHistoryRepository history;

    public Warehouse mainWarehouse() {
        return warehouses.findByCode(MAIN_CODE).orElseThrow(() -> new BadRequestException("Main warehouse missing; run warehouse migrations"));
    }

    public Warehouse warehouse(Long id) {
        return warehouses.findById(id).orElseThrow(() -> new ResourceNotFoundException("Warehouse", "id", id));
    }

    public Warehouse activeWarehouse(Long id) {
        Warehouse warehouse = warehouse(id);
        if (!"ACTIVE".equals(warehouse.getStatus())) throw new BadRequestException("Warehouse is inactive");
        return warehouse;
    }

    public void requireActiveMain() { activeWarehouse(mainWarehouse().getId()); }

    private WarehouseStock newStock(Warehouse warehouse, PhoneVariant variant, int quantity) {
        WarehouseStock stock = new WarehouseStock();
        stock.setWarehouse(warehouse); stock.setPhoneVariant(variant); stock.setQuantity(quantity);
        return stocks.save(stock);
    }

    public void initialize(PhoneVariant variant, int aggregateBefore) {
        // Supports newly-created variants and Hibernate-only test/demo fixtures.
        // Never backfill again when any allocation already exists.
        if (!stocks.existsByPhoneVariantId(variant.getId())) {
            newStock(mainWarehouse(), variant, aggregateBefore);
        }
    }

    public void apply(PhoneVariant variant, Warehouse warehouse, int aggregateBefore, int delta,
                      String type, String reason, String transferReference) {
        initialize(variant, aggregateBefore);
        WarehouseStock stock = stocks.findByWarehouseIdAndPhoneVariantId(warehouse.getId(), variant.getId())
                .orElseGet(() -> newStock(warehouse, variant, 0));
        int before = stock.getQuantity();
        final int after;
        try { after = Math.addExact(before, delta); }
        catch (ArithmeticException ex) { throw new BadRequestException("Stock quantity overflow"); }
        if (after < 0) throw new BadRequestException("Insufficient stock at warehouse " + warehouse.getCode());
        stock.setQuantity(after);
        stocks.save(stock);
        WarehouseStockHistory entry = new WarehouseStockHistory();
        entry.setWarehouse(warehouse); entry.setPhoneVariant(variant);
        entry.setQuantityBefore(before); entry.setQuantityChange(delta); entry.setQuantityAfter(after);
        entry.setChangeType(type); entry.setReason(reason); entry.setTransferReference(transferReference);
        String name = "SYSTEM";
        try { name = SecurityUtils.getCurrentUser().getFullName(); } catch (RuntimeException ignored) { }
        entry.setChangedByName(name == null || name.isBlank() ? "SYSTEM" : name);
        history.save(entry);
    }

    public void applyDefault(PhoneVariant variant, int before, int delta, String type, String reason) {
        Warehouse main = mainWarehouse();
        if (delta < 0) activeWarehouse(main.getId());
        apply(variant, main, before, delta, type, reason, null);
    }
}
