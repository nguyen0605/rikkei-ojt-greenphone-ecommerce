package com.re.greenphone.repository;

import com.re.greenphone.entity.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long> {

    List<OrderDetail> findByOrderId(Long orderId);

    boolean existsByPhoneVariantId(Long phoneVariantId);

    @Query(value = "SELECT od.phoneVariant.phone.id, od.phoneVariant.phone.name, od.phoneVariant.phone.brand.name, SUM(od.quantity) " +
           "FROM OrderDetail od GROUP BY od.phoneVariant.phone.id, od.phoneVariant.phone.name, od.phoneVariant.phone.brand.name ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingPhonesRaw();

    /** Top-selling theo khoảng thời gian (dùng trong dashboard month filter + export). */
    @Query(value = "SELECT od.phoneVariant.phone.id, od.phoneVariant.phone.name, od.phoneVariant.phone.brand.name, SUM(od.quantity) " +
           "FROM OrderDetail od WHERE od.order.createdAt >= :from AND od.order.createdAt < :to " +
           "GROUP BY od.phoneVariant.phone.id, od.phoneVariant.phone.name, od.phoneVariant.phone.brand.name ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingPhonesBetween(@org.springframework.data.repository.query.Param("from") LocalDateTime from,
                                               @org.springframework.data.repository.query.Param("to") LocalDateTime to);
}
