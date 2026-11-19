package com.re.greenphone.repository;

import com.re.greenphone.entity.WarehouseStock;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, Long> {
    @EntityGraph(attributePaths = {"warehouse", "phoneVariant"})
    @Query("SELECT ws FROM WarehouseStock ws WHERE ws.phoneVariant.phone.id IN :phoneIds " +
            "AND ws.warehouse.status = 'ACTIVE' AND (:warehouseId IS NULL OR ws.warehouse.id = :warehouseId) " +
            "AND (:lowStock = false OR (ws.quantity > 0 AND ws.quantity <= :threshold)) ORDER BY ws.id")
    List<WarehouseStock> findInventoryStock(
            @org.springframework.data.repository.query.Param("phoneIds") Collection<Long> phoneIds,
            @org.springframework.data.repository.query.Param("warehouseId") Long warehouseId,
            @org.springframework.data.repository.query.Param("lowStock") boolean lowStock,
            @org.springframework.data.repository.query.Param("threshold") int threshold);

    Optional<WarehouseStock> findByWarehouseIdAndPhoneVariantId(Long warehouseId, Long variantId);
    boolean existsByPhoneVariantId(Long variantId);
    @EntityGraph(attributePaths = {"warehouse", "phoneVariant", "phoneVariant.phone", "phoneVariant.ramItem", "phoneVariant.storageItem", "phoneVariant.colorItem"})
    List<WarehouseStock> findByWarehouseIdOrderByIdAsc(Long warehouseId);
    @EntityGraph(attributePaths = {"warehouse", "phoneVariant"})
    List<WarehouseStock> findByPhoneVariantId(Long variantId);

    @Query("SELECT ws FROM WarehouseStock ws WHERE ws.warehouse.id = :warehouseId AND ws.phoneVariant.id IN :variantIds")
    List<WarehouseStock> findByWarehouseIdAndPhoneVariantIdIn(@org.springframework.data.repository.query.Param("warehouseId") Long warehouseId, @org.springframework.data.repository.query.Param("variantIds") Collection<Long> variantIds);

    @Query("SELECT ws FROM WarehouseStock ws WHERE ws.warehouse.id IN :warehouseIds AND ws.phoneVariant.id IN :variantIds")
    List<WarehouseStock> findByWarehouseIdInAndPhoneVariantIdIn(@org.springframework.data.repository.query.Param("warehouseIds") Collection<Long> warehouseIds, @org.springframework.data.repository.query.Param("variantIds") Collection<Long> variantIds);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ws FROM WarehouseStock ws WHERE ws.warehouse.id = :warehouseId AND ws.phoneVariant.id = :variantId")
    Optional<WarehouseStock> findByWarehouseIdAndPhoneVariantIdForUpdate(
            @org.springframework.data.repository.query.Param("warehouseId") Long warehouseId,
            @org.springframework.data.repository.query.Param("variantId") Long variantId);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ws FROM WarehouseStock ws WHERE ws.warehouse.id IN :warehouseIds AND ws.phoneVariant.id IN :variantIds ORDER BY ws.warehouse.id ASC, ws.phoneVariant.id ASC")
    List<WarehouseStock> findByWarehouseIdInAndPhoneVariantIdInForUpdate(
            @org.springframework.data.repository.query.Param("warehouseIds") Collection<Long> warehouseIds,
            @org.springframework.data.repository.query.Param("variantIds") Collection<Long> variantIds);
}
