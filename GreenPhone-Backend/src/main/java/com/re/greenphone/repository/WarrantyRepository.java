package com.re.greenphone.repository;

import com.re.greenphone.entity.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, Long> {

    Optional<Warranty> findByImeiNumber(String imeiNumber);

    List<Warranty> findByCustomerPhone(String customerPhone);

    List<Warranty> findByOrderId(Long orderId);

    boolean existsByImeiNumber(String imeiNumber);
}
