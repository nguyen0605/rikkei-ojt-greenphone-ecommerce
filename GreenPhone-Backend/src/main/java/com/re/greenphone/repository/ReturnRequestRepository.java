package com.re.greenphone.repository;

import com.re.greenphone.entity.ReturnRequest;
import com.re.greenphone.enums.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    Optional<ReturnRequest> findByReturnCode(String returnCode);

    List<ReturnRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ReturnRequest> findByOrderId(Long orderId);

    Page<ReturnRequest> findByStatus(ReturnStatus status, Pageable pageable);

    boolean existsByOrderIdAndPhoneVariantIdAndStatusIn(
            Long orderId,
            Long phoneVariantId,
            List<ReturnStatus> statuses
    );
}

