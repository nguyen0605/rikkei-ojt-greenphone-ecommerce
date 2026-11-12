package com.re.greenphone.repository;

import com.re.greenphone.entity.WarrantyClaimHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarrantyClaimHistoryRepository extends JpaRepository<WarrantyClaimHistory, Long> {

    List<WarrantyClaimHistory> findByWarrantyClaimIdOrderByCreatedAtDesc(Long warrantyClaimId);
}
