package com.re.greenphone.repository;
import com.re.greenphone.entity.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,Long>, JpaSpecificationExecutor<PurchaseOrder> {
    @Query("select sum(i.unitCost * i.quantityReceived), sum(i.quantityReceived) from PurchaseOrderItem i where i.phoneVariant.id=:variantId and i.purchaseOrder.status='RECEIVED' and i.quantityReceived>0")
    java.util.List<Object[]> receivedCost(@Param("variantId") Long variantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PurchaseOrder p where p.id=:id")
    Optional<PurchaseOrder> findByIdWithLock(@Param("id") Long id);
    @Query("select p from PurchaseOrder p where (:status is null or p.status=:status)")
    Page<PurchaseOrder> search(@Param("status") String status, Pageable pageable);
}
