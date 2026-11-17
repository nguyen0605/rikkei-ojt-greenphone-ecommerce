package com.re.greenphone.repository;

import com.re.greenphone.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {
    List<ReviewImage> findByReviewIdOrderBySortOrderAscIdAsc(Long reviewId);
    void deleteByReviewId(Long reviewId);
}
