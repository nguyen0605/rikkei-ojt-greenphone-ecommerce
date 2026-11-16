package com.re.greenphone.repository;

import com.re.greenphone.entity.WarehouseTransfer;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WarehouseTransferRepository extends JpaRepository<WarehouseTransfer, Long> {

    Optional<WarehouseTransfer> findByTransferCode(String transferCode);

    boolean existsByTransferCode(String transferCode);

    List<WarehouseTransfer> findByOrderId(Long orderId);

    List<WarehouseTransfer> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    long countByOrderIdAndStatusNot(Long orderId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT wt FROM WarehouseTransfer wt WHERE wt.id = :id")
    Optional<WarehouseTransfer> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT wt FROM WarehouseTransfer wt WHERE " +
           "(:status IS NULL OR wt.status = :status) AND " +
           "(:sourceWarehouseId IS NULL OR wt.sourceWarehouse.id = :sourceWarehouseId) AND " +
           "(:destinationWarehouseId IS NULL OR wt.destinationWarehouse.id = :destinationWarehouseId) AND " +
           "(:orderId IS NULL OR wt.order.id = :orderId)")
    Page<WarehouseTransfer> findByFilter(
            @Param("status") String status,
            @Param("sourceWarehouseId") Long sourceWarehouseId,
            @Param("destinationWarehouseId") Long destinationWarehouseId,
            @Param("orderId") Long orderId,
            Pageable pageable);

    @Query("SELECT wt FROM WarehouseTransfer wt WHERE " +
           "(:status IS NULL OR wt.status = :status) AND " +
           "(wt.sourceWarehouse.id = :warehouseId OR wt.destinationWarehouse.id = :warehouseId) AND " +
           "(:orderId IS NULL OR wt.order.id = :orderId)")
    Page<WarehouseTransfer> findByFilterAndBranchWarehouse(
            @Param("status") String status,
            @Param("warehouseId") Long warehouseId,
            @Param("orderId") Long orderId,
            Pageable pageable);
}

