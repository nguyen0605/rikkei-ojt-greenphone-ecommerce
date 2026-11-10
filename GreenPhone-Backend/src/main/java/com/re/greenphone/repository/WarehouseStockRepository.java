package com.re.greenphone.repository;

import com.re.greenphone.entity.WarehouseStock;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long> {
    Optional<WarehouseStock> findByWarehouseIdAndPhoneVariantId(Long warehouseId, Long variantId);
    boolean existsByPhoneVariantId(Long variantId);
    @EntityGraph(attributePaths = {"warehouse", "phoneVariant", "phoneVariant.phone", "phoneVariant.ramItem", "phoneVariant.storageItem", "phoneVariant.colorItem"})
    List<WarehouseStock> findByWarehouseIdOrderByIdAsc(Long warehouseId);
    @EntityGraph(attributePaths = {"warehouse", "phoneVariant"})
    List<WarehouseStock> findByPhoneVariantId(Long variantId);
}
