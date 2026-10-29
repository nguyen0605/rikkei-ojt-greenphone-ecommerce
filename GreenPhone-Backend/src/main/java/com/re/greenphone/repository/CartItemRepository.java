package com.re.greenphone.repository;

import com.re.greenphone.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndPhoneVariantId(Long cartId, Long phoneVariantId);

    boolean existsByPhoneVariantId(Long phoneVariantId);

    void deleteByCartId(Long cartId);
}
