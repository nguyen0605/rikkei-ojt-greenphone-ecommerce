package com.re.greenphone.repository;

import com.re.greenphone.entity.InventoryStockHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryStockHistoryRepository extends JpaRepository<InventoryStockHistory, Long> {

    List<InventoryStockHistory> findByPhoneVariantIdOrderByCreatedAtDescIdDesc(Long phoneVariantId);
}
