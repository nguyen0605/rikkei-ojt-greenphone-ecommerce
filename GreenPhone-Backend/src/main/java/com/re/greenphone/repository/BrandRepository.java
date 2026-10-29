package com.re.greenphone.repository;

import com.re.greenphone.entity.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findByName(String name);

    boolean existsByName(String name);

    List<Brand> findByStatus(String status);

    Page<Brand> findByNameContainingIgnoreCase(String keyword, Pageable pageable);
}
