package com.re.greenphone.repository;

import com.re.greenphone.entity.UserPromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPromotionRepository extends JpaRepository<UserPromotion, Long> {

    List<UserPromotion> findByUserId(Long userId);

    List<UserPromotion> findByUserIdAndStatus(Long userId, String status);

    List<UserPromotion> findByUserIdOrderByReceivedAtDesc(Long userId);

    Optional<UserPromotion> findByUserIdAndPromotionId(Long userId, Long promotionId);

    boolean existsByUserIdAndPromotionId(Long userId, Long promotionId);
}
