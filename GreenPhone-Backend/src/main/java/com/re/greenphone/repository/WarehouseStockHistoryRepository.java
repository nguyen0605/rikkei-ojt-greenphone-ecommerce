package com.re.greenphone.repository;

import com.re.greenphone.entity.WarehouseStockHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface WarehouseStockHistoryRepository extends JpaRepository<WarehouseStockHistory, Long> {
    @EntityGraph(attributePaths = {"phoneVariant"})
    List<WarehouseStockHistory> findByWarehouseIdOrderByCreatedAtDescIdDesc(Long warehouseId, Pageable page);
    @EntityGraph(attributePaths = {"phoneVariant"})
    List<WarehouseStockHistory> findByWarehouseIdAndPhoneVariantIdOrderByCreatedAtDescIdDesc(Long warehouseId, Long variantId, Pageable page);

    boolean existsByTransferReference(String transferReference);
}
