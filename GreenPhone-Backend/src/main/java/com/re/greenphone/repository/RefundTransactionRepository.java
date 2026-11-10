package com.re.greenphone.repository;

import com.re.greenphone.entity.RefundTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Long> {

    Optional<RefundTransaction> findByOrderId(Long orderId);

    Page<RefundTransaction> findByStatus(String status, Pageable pageable);

    @Modifying
    @Query("UPDATE RefundTransaction r SET r.status = 'PROCESSING', r.processedBy = :adminId " +
            "WHERE r.order.id = :orderId AND r.status = 'REQUESTED'")
    int claimRefund(@Param("orderId") Long orderId, @Param("adminId") Long adminId);
}

