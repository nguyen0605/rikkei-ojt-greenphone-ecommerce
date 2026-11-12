package com.re.greenphone.repository;

import com.re.greenphone.entity.Wishlist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    @EntityGraph(attributePaths = {"phone", "phone.brand"})
    @Query("SELECT w FROM Wishlist w WHERE w.user.id = :userId ORDER BY w.createdAt DESC")
    List<Wishlist> findByUserId(@Param("userId") Long userId);

    boolean existsByUserIdAndPhoneId(Long userId, Long phoneId);

    Optional<Wishlist> findByUserIdAndPhoneId(Long userId, Long phoneId);

    @Modifying
    @Query("DELETE FROM Wishlist w WHERE w.user.id = :userId AND w.phone.id = :phoneId")
    void deleteByUserIdAndPhoneId(@Param("userId") Long userId, @Param("phoneId") Long phoneId);
}
