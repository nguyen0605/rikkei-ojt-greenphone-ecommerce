package com.re.greenphone.repository;

import com.re.greenphone.entity.PhoneImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhoneImageRepository extends JpaRepository<PhoneImage, Long> {

    List<PhoneImage> findByPhoneId(Long phoneId);

    List<PhoneImage> findByPhoneIdOrderBySortOrderAscIdAsc(Long phoneId);

    void deleteByPhoneId(Long phoneId);
}
