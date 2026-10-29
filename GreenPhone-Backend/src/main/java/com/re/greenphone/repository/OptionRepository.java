package com.re.greenphone.repository;

import com.re.greenphone.entity.Option;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OptionRepository extends JpaRepository<Option, Long> {

    List<Option> findAllByOrderBySortOrderAscIdAsc();

    Optional<Option> findByType(String type);

    boolean existsByType(String type);

    List<Option> findByEnabledTrueOrderBySortOrderAscIdAsc();
}
