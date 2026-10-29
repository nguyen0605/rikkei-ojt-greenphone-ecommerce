package com.re.greenphone.repository;

import com.re.greenphone.entity.OptionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OptionItemRepository extends JpaRepository<OptionItem, Long> {

    List<OptionItem> findByOptionIdOrderBySortOrderAscIdAsc(Long optionId);

    @Query("SELECT i FROM OptionItem i JOIN i.option o WHERE o.type = :type ORDER BY i.sortOrder ASC, i.id ASC")
    List<OptionItem> findByOptionTypeOrderBySortOrderAscIdAsc(@Param("type") String type);

    Optional<OptionItem> findByOptionIdAndValue(Long optionId, String value);

    @Query("SELECT i FROM OptionItem i JOIN i.option o WHERE o.type = :type AND i.value = :value")
    Optional<OptionItem> findByOptionTypeAndValue(@Param("type") String type, @Param("value") String value);

    boolean existsByOptionIdAndValue(Long optionId, String value);
}
