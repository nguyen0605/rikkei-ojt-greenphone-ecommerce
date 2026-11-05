package com.re.greenphone.repository;

import com.re.greenphone.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByPhoneIdAndStatus(Long phoneId, String status);

    List<Review> findByPhoneIdAndStatusIn(Long phoneId, Collection<String> statuses);

    List<Review> findByPhoneId(Long phoneId);

    List<Review> findByUserId(Long userId);

    Page<Review> findByUserId(Long userId, Pageable pageable);

    Page<Review> findByPhoneId(Long phoneId, Pageable pageable);

    Page<Review> findByPhoneIdAndStatusIn(Long phoneId, Collection<String> statuses, Pageable pageable);

    boolean existsByOrderDetailId(Long orderDetailId);

    boolean existsByPhoneId(Long phoneId);

    boolean existsByUserIdAndPhoneId(Long userId, Long phoneId);

    @Query("SELECT COUNT(r) > 0 FROM Review r WHERE r.orderDetail.order.id = :orderId AND r.phone.id = :phoneId")
    boolean existsByOrderIdAndPhoneId(@Param("orderId") Long orderId, @Param("phoneId") Long phoneId);

    Page<Review> findByStatus(String status, Pageable pageable);

    Page<Review> findByRating(Integer rating, Pageable pageable);

    Page<Review> findByStatusAndRating(String status, Integer rating, Pageable pageable);
}
