package com.re.greenphone.repository;

import com.re.greenphone.entity.OrderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderHistoryRepository extends JpaRepository<OrderHistory, Long> {

    List<OrderHistory> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    List<OrderHistory> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}

