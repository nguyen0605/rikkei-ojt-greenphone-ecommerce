package com.re.greenphone.repository;

import com.re.greenphone.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByOrderIdOrderByIdAsc(Long orderId);

    /** Legacy alias kept for tests; use findByOrderIdOrderByIdAsc in production code. */
    List<Payment> findByOrderId(Long orderId);

    Optional<Payment> findByTransactionCode(String transactionCode);
}
