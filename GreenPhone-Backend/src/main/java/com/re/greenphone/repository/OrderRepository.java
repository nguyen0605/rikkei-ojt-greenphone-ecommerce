package com.re.greenphone.repository;

import com.re.greenphone.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserId(Long userId, Pageable pageable);

    List<Order> findByOrderStatus(String orderStatus);

    Page<Order> findByOrderStatus(String orderStatus, Pageable pageable);

    Page<Order> findByUserIdAndOrderStatus(Long userId, String orderStatus, Pageable pageable);

    /** Admin: search theo tên người nhận / SĐT / id đơn; status optional. */
    @Query("SELECT o FROM Order o WHERE " +
            "(LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(o.receiverPhone) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR CAST(o.id AS string) LIKE CONCAT('%', :search, '%')) " +
            "AND (:status IS NULL OR o.orderStatus = :status)")
    Page<Order> findByOrderStatusOrUserInfo(@Param("search") String search,
                                            @Param("status") String status,
                                            Pageable pageable);

    @Query("select function('date', function('convert_tz', o.createdAt, '+00:00', '+07:00')), sum(o.totalAmount), sum(coalesce(o.discountAmount,0)), sum(coalesce(o.shippingFee,0)), count(o) from Order o where o.paymentStatus='PAID' and o.createdAt>=:from and o.createdAt<:to group by function('date', function('convert_tz', o.createdAt, '+00:00', '+07:00'))")
    List<Object[]> financialDaily(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select o.paymentMethod, sum(o.totalAmount-coalesce(o.discountAmount,0)), count(o) from Order o where o.paymentStatus='PAID' and o.orderStatus != 'CANCELLED' and o.createdAt>=:from and o.createdAt<:to group by o.paymentMethod")
    List<Object[]> paymentBreakdown(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByOrderStatus(String orderStatus);

    long countByCreatedAtAfter(LocalDateTime date);

    @Query("SELECT COALESCE(SUM(o.finalAmount), 0) FROM Order o WHERE o.createdAt >= :date AND o.paymentStatus = 'PAID'")
    BigDecimal calculateRevenue(LocalDateTime date);

    @Query("SELECT COALESCE(SUM(o.finalAmount), 0) FROM Order o WHERE o.createdAt >= :from AND o.createdAt < :to AND o.paymentStatus = 'PAID'")
    BigDecimal calculateRevenueBetween(LocalDateTime from, LocalDateTime to);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("select count(o) from Order o where o.orderStatus=:orderStatus and o.createdAt>=:from and o.createdAt<:to")
    long countByOrderStatusAndCreatedAtBetween(@Param("orderStatus") String orderStatus, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    List<Order> findByOrderStatusAndPaymentStatusAndPaymentMethodInAndCreatedAtBefore(
            String orderStatus, String paymentStatus, List<String> paymentMethods, LocalDateTime dateTime);

    @Query("SELECT DISTINCT o FROM Order o " +
            "LEFT JOIN FETCH o.orderDetails od " +
            "LEFT JOIN FETCH od.phoneVariant pv " +
            "LEFT JOIN FETCH o.user u " +
            "LEFT JOIN FETCH o.userPromotion up " +
            "LEFT JOIN FETCH up.promotion " +
            "WHERE o.id = :id")
    Optional<Order> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT o FROM Order o " +
            "LEFT JOIN FETCH o.orderDetails od " +
            "LEFT JOIN FETCH od.phoneVariant pv " +
            "LEFT JOIN FETCH o.user u " +
            "LEFT JOIN FETCH o.userPromotion up " +
            "LEFT JOIN FETCH up.promotion " +
            "WHERE o.invoiceToken = :token")
    Optional<Order> findByInvoiceTokenWithDetails(@Param("token") String token);

    Optional<Order> findByInvoiceToken(String invoiceToken);
}
