package com.re.greenphone.repository;

import com.re.greenphone.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    java.util.Optional<com.re.greenphone.entity.Warehouse> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);
    java.util.List<Warehouse> findByStatus(String status);
}
