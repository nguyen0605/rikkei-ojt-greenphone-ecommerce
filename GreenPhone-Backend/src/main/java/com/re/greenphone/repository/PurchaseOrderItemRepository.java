package com.re.greenphone.repository;

import com.re.greenphone.entity.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    boolean existsByPhoneVariantId(Long phoneVariantId);
}
