package com.re.greenphone.repository;

import com.re.greenphone.entity.ShipmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShipmentHistoryRepository extends JpaRepository<ShipmentHistory, Long> {

    List<ShipmentHistory> findByShipmentIdOrderByCreatedAtDesc(Long shipmentId);

    List<ShipmentHistory> findByShipmentIdOrderByCreatedAtAsc(Long shipmentId);
}
