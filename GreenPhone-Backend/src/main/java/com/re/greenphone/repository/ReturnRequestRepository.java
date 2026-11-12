package com.re.greenphone.repository;

import com.re.greenphone.entity.ReturnRequest;
import com.re.greenphone.enums.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    Optional<ReturnRequest> findByReturnCode(String returnCode);

    List<ReturnRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ReturnRequest> findByOrderId(Long orderId);

    Page<ReturnRequest> findByStatus(ReturnStatus status, Pageable pageable);

    @Query("""
            SELECT r FROM ReturnRequest r
            LEFT JOIN r.order o
            LEFT JOIN r.user u
            WHERE (:status IS NULL OR r.status = :status)
              AND (
                :keyword IS NULL OR :keyword = ''
                OR LOWER(r.returnCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR CAST(o.id AS string) LIKE CONCAT('%', :keyword, '%')
                OR LOWER(COALESCE(o.receiverPhone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(o.receiverName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<ReturnRequest> searchAdminRequests(
            @Param("status") ReturnStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    boolean existsByOrderIdAndPhoneVariantIdAndStatusIn(
            Long orderId,
            Long phoneVariantId,
            List<ReturnStatus> statuses
    );
}

