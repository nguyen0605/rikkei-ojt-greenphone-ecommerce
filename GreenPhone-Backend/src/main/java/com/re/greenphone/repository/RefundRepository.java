package com.re.greenphone.repository;

import com.re.greenphone.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {

    @org.springframework.data.jpa.repository.Query("select function('date', function('convert_tz', r.refundedAt, '+00:00', '+07:00')), sum(r.amount) from Refund r where r.status='COMPLETED' and r.refundedAt>=:from and r.refundedAt<:to group by function('date', function('convert_tz', r.refundedAt, '+00:00', '+07:00'))")
    List<Object[]> refundDaily(@org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
                               @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    Optional<Refund> findByRefundCode(String refundCode);

    List<Refund> findByOrderId(Long orderId);

    Optional<Refund> findByReturnRequestId(Long returnRequestId);

    boolean existsByOrderId(Long orderId);
}

