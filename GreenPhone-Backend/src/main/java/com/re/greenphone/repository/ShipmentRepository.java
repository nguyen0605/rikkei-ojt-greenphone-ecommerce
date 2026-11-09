package com.re.greenphone.repository;

import com.re.greenphone.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    Optional<Shipment> findByTrackingNumber(String trackingNumber);

    List<Shipment> findByOrderId(Long orderId);

    boolean existsByTrackingNumber(String trackingNumber);

    boolean existsByOrderId(Long orderId);
}
