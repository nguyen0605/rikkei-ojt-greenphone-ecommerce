package com.re.greenphone.repository;
import com.re.greenphone.entity.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,Long>, JpaSpecificationExecutor<PurchaseOrder> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PurchaseOrder p where p.id=:id")
    Optional<PurchaseOrder> findByIdWithLock(@Param("id") Long id);
    @Query("select p from PurchaseOrder p where (:status is null or p.status=:status)")
    Page<PurchaseOrder> search(@Param("status") String status, Pageable pageable);
}
