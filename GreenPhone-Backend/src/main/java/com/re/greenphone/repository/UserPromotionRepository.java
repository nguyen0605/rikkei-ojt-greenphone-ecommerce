package com.re.greenphone.repository;

import com.re.greenphone.entity.UserPromotion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPromotionRepository extends JpaRepository<UserPromotion, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT up FROM UserPromotion up WHERE up.id = :id")
    Optional<UserPromotion> findByIdWithLock(@Param("id") Long id);

    List<UserPromotion> findByUserId(Long userId);

    List<UserPromotion> findByUserIdAndStatus(Long userId, String status);

    List<UserPromotion> findByUserIdOrderByReceivedAtDesc(Long userId);

    Optional<UserPromotion> findByUserIdAndPromotionId(Long userId, Long promotionId);

    boolean existsByUserIdAndPromotionId(Long userId, Long promotionId);

    boolean existsByPromotionId(Long promotionId);
}
