package com.re.greenphone.repository;

import com.re.greenphone.dto.response.BrandFilterDTO;
import com.re.greenphone.entity.Phone;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhoneRepository extends JpaRepository<Phone, Long>, JpaSpecificationExecutor<Phone> {

    /**
     * Load phones with brand in a single query via JOIN FETCH (ManyToOne — no row duplication).
     * Filters by brandIds. NOTE: brandIds must be non-empty (null/empty handled in service).
     * Images/variants/reviews are batch-loaded via hibernate.default_batch_fetch_size=16.
     */
    @Query("SELECT p FROM Phone p JOIN FETCH p.brand WHERE p.brand.id IN :brandIds")
    Page<Phone> findAllWithBrand(List<Long> brandIds, Pageable pageable);

    /**
     * Lightweight projection for filter dropdowns — only brand id + name,
     * avoids loading full Phone entities.
     */
    @Query("""
        SELECT DISTINCT new com.re.greenphone.dto.response.BrandFilterDTO(p.brand.id, p.brand.name)
        FROM Phone p
        """)
    List<BrandFilterDTO> findDistinctBrands();

    /**
     * Phones whose description mentions the given feature option value (case-insensitive LIKE).
     */
    @Query("SELECT p FROM Phone p WHERE LOWER(p.description) LIKE LOWER(CONCAT('%', :value, '%'))")
    List<Phone> findByDescriptionContainingIgnoreCase(@Param("value") String value);

    /** Detail page: only active phones are visible in the store. */
    Optional<Phone> findByIdAndStatus(Long id, String status);

    /** Hard-delete guard: any phone still referencing this brand blocks deletion. */
    boolean existsByBrandId(Long brandId);
}
