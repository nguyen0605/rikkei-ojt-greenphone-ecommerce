package com.re.greenphone.repository;

import com.re.greenphone.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByRefundCode(String refundCode);

    List<Refund> findByOrderId(Long orderId);

    Optional<Refund> findByReturnRequestId(Long returnRequestId);

    boolean existsByOrderId(Long orderId);
}

