package com.re.greenphone.repository;

import com.re.greenphone.entity.WarrantyClaim;
import com.re.greenphone.enums.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, Long> {

    Optional<WarrantyClaim> findByClaimCode(String claimCode);

    boolean existsByClaimCode(String claimCode);

    List<WarrantyClaim> findByWarrantyId(Long warrantyId);

    List<WarrantyClaim> findByWarranty_ImeiNumber(String imeiNumber);

    List<WarrantyClaim> findByStatus(ClaimStatus status);
}
