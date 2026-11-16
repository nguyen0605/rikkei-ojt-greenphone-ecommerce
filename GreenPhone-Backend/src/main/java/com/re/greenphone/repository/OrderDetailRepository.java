package com.re.greenphone.repository;

import com.re.greenphone.entity.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long> {

    @Query("select function('date', function('convert_tz', d.order.createdAt, '+00:00', '+07:00')), sum(d.unitCost*d.quantity), sum(case when d.unitCost is null then d.quantity else 0 end) from OrderDetail d where d.order.paymentStatus='PAID' and d.order.createdAt>=:from and d.order.createdAt<:to group by function('date', function('convert_tz', d.order.createdAt, '+00:00', '+07:00'))")
    List<Object[]> costDaily(@org.springframework.data.repository.query.Param("from") LocalDateTime from,
                            @org.springframework.data.repository.query.Param("to") LocalDateTime to);

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
