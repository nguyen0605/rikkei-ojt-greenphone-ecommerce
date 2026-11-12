package com.re.greenphone.repository;

import com.re.greenphone.entity.WarehouseTransferItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface WarehouseTransferItemRepository extends JpaRepository<WarehouseTransferItem, Long> {

    List<WarehouseTransferItem> findByTransferId(Long transferId);

    List<WarehouseTransferItem> findByTransferIdIn(Collection<Long> transferIds);
}

