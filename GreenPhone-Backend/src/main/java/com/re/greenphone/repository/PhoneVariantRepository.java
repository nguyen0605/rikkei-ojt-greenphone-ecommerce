package com.re.greenphone.repository;

import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneVariant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhoneVariantRepository extends JpaRepository<PhoneVariant, Long> {

    List<PhoneVariant> findByPhoneId(Long phoneId);

    Optional<PhoneVariant> findBySku(String sku);

    /**
     * Phones whose any variant references the given option item (RAM/STORAGE/COLOR — FK match).
     */
    @Query("SELECT DISTINCT v.phone FROM PhoneVariant v WHERE v.ramItem.id = :itemId OR v.storageItem.id = :itemId OR v.colorItem.id = :itemId")
    List<Phone> findPhonesByOptionItemId(@Param("itemId") Long itemId);

    /**
     * Pessimistic lock: serializes stock decrements across concurrent order creations.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from PhoneVariant v where v.id = :id")
    Optional<PhoneVariant> findByIdWithLock(@Param("id") Long id);
}
