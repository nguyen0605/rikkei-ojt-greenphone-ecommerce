package com.re.greenphone.repository;

import com.re.greenphone.entity.Banner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Long> {

    List<Banner> findByStatusOrderBySortOrderAsc(String status);

    Page<Banner> findByTitleContainingIgnoreCaseOrderBySortOrderAsc(String title, Pageable pageable);

    Page<Banner> findAllByOrderBySortOrderAsc(Pageable pageable);
}
