package com.re.greenphone.repository;

import com.re.greenphone.entity.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, Long> {

    Optional<Warranty> findByImeiNumber(String imeiNumber);

    List<Warranty> findByCustomerPhone(String customerPhone);

    List<Warranty> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);

    List<Warranty> findByOrderId(Long orderId);

    boolean existsByImeiNumber(String imeiNumber);

    boolean existsByOrderId(Long orderId);

    @Query("SELECT DISTINCT w FROM Warranty w " +
           "LEFT JOIN FETCH w.phoneVariant pv " +
           "LEFT JOIN FETCH pv.phone p " +
           "LEFT JOIN FETCH p.images " +
           "LEFT JOIN FETCH pv.ramItem " +
           "LEFT JOIN FETCH pv.storageItem " +
           "LEFT JOIN FETCH pv.colorItem " +
           "WHERE (w.status IS NULL OR UPPER(w.status) != 'VOIDED') " +
           "  AND (w.imeiNumber = :query " +
           "   OR w.customerPhone = :query " +
           "   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY w.createdAt DESC")
    List<Warranty> searchByImeiOrPhone(@Param("query") String query);
}
