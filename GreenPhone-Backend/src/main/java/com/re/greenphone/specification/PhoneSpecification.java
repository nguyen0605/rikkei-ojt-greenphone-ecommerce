package com.re.greenphone.specification;

import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneVariant;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PhoneSpecification {

    /**
     * Unified dynamic query Specification for phone listings and search.
     * Supports Brand, Price Range (min/max), RAM, Storage (ROM), Color, Features, and Sorting.
     */
    public static Specification<Phone> filterPhones(
            String query,
            List<Long> brandIds,
            List<String> rams,
            List<String> storages,
            List<String> colors,
            List<String> features,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String sort) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ hiển thị sản phẩm ACTIVE trong store
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));

            // 2. Tìm kiếm theo tên sản phẩm (case-insensitive LIKE)
            if (query != null && !query.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + query.trim().toLowerCase() + "%"));
            }

            // 3. Lọc theo thương hiệu (Brand IDs)
            if (brandIds != null && !brandIds.isEmpty()) {
                predicates.add(root.get("brand").get("id").in(brandIds));
            }

            // 4. Lọc theo biến thể cấu hình (RAM, Storage ROM, Màu sắc, Khoảng giá)
            boolean needVariantJoin = (rams != null && !rams.isEmpty())
                    || (storages != null && !storages.isEmpty())
                    || (colors != null && !colors.isEmpty())
                    || minPrice != null
                    || maxPrice != null;

            if (needVariantJoin) {
                Join<Phone, PhoneVariant> variants = root.join("variants", JoinType.INNER);
                // Biến thể cũng phải ở trạng thái ACTIVE
                predicates.add(cb.equal(variants.get("status"), "ACTIVE"));

                if (rams != null && !rams.isEmpty()) {
                    List<String> lowerRams = rams.stream().map(s -> s.trim().toLowerCase()).toList();
                    predicates.add(cb.lower(variants.join("ramItem").get("value")).in(lowerRams));
                }

                if (storages != null && !storages.isEmpty()) {
                    List<String> lowerStorages = storages.stream().map(s -> s.trim().toLowerCase()).toList();
                    predicates.add(cb.lower(variants.join("storageItem").get("value")).in(lowerStorages));
                }

                if (colors != null && !colors.isEmpty()) {
                    List<String> lowerColors = colors.stream().map(s -> s.trim().toLowerCase()).toList();
                    predicates.add(cb.lower(variants.join("colorItem").get("value")).in(lowerColors));
                }

                if (minPrice != null) {
                    predicates.add(cb.greaterThanOrEqualTo(
                            cb.coalesce(variants.get("discountPrice"), variants.get("price")), minPrice));
                }

                if (maxPrice != null) {
                    predicates.add(cb.lessThanOrEqualTo(
                            cb.coalesce(variants.get("discountPrice"), variants.get("price")), maxPrice));
                }

                // Tránh nhân đôi hàng khi join với bảng biến thể
                cq.distinct(true);
            }

            // 5. Lọc theo tính năng nổi bật (features) tìm trong description
            if (features != null && !features.isEmpty()) {
                for (String f : features) {
                    if (f != null && !f.isBlank()) {
                        predicates.add(cb.like(cb.lower(root.get("description")), "%" + f.trim().toLowerCase() + "%"));
                    }
                }
            }

            // 6. Sắp xếp đa chiều (Sort)
            applySorting(sort, root, cq, cb);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void applySorting(String sort, Root<Phone> root, CriteriaQuery<?> cq, CriteriaBuilder cb) {
        if (sort == null || sort.isBlank()) {
            cq.orderBy(cb.desc(root.get("id")));
            return;
        }

        switch (sort.toLowerCase().trim()) {
            case "price-asc" -> {
                // Giá tăng dần: lấy giá thấp nhất giữa các biến thể active của máy
                Subquery<BigDecimal> minPriceSub = cq.subquery(BigDecimal.class);
                Root<PhoneVariant> pvRoot = minPriceSub.from(PhoneVariant.class);
                minPriceSub.select(cb.min(cb.coalesce(pvRoot.get("discountPrice"), pvRoot.get("price"))));
                minPriceSub.where(cb.equal(pvRoot.get("phone"), root), cb.equal(pvRoot.get("status"), "ACTIVE"));
                cq.orderBy(cb.asc(minPriceSub), cb.asc(root.get("id")));
            }
            case "price-desc" -> {
                // Giá giảm dần: lấy giá cao nhất hoặc giá thấp nhất xếp giảm dần
                Subquery<BigDecimal> priceSub = cq.subquery(BigDecimal.class);
                Root<PhoneVariant> pvRoot = priceSub.from(PhoneVariant.class);
                priceSub.select(cb.min(cb.coalesce(pvRoot.get("discountPrice"), pvRoot.get("price"))));
                priceSub.where(cb.equal(pvRoot.get("phone"), root), cb.equal(pvRoot.get("status"), "ACTIVE"));
                cq.orderBy(cb.desc(priceSub), cb.desc(root.get("id")));
            }
            case "newest" -> {
                // Mới nhất: theo ngày tạo hoặc id giảm dần
                cq.orderBy(cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
            }
            case "bestseller", "best-selling", "sold" -> {
                // Bán chạy nhất: subquery tính tổng số lượng đã bán trong OrderDetail
                Subquery<Long> soldSub = cq.subquery(Long.class);
                Root<OrderDetail> odRoot = soldSub.from(OrderDetail.class);
                soldSub.select(cb.coalesce(cb.sum(odRoot.get("quantity")), 0L));
                soldSub.where(cb.equal(odRoot.get("phoneVariant").get("phone"), root));
                cq.orderBy(cb.desc(soldSub), cb.desc(root.get("id")));
            }
            case "discount" -> {
                // Mức chiết khấu cao nhất (giá gốc - giá bán)
                Subquery<BigDecimal> discountSub = cq.subquery(BigDecimal.class);
                Root<PhoneVariant> pvRoot = discountSub.from(PhoneVariant.class);
                discountSub.select(cb.max(cb.diff(pvRoot.get("price"), cb.coalesce(pvRoot.get("discountPrice"), pvRoot.get("price")))));
                discountSub.where(cb.equal(pvRoot.get("phone"), root), cb.equal(pvRoot.get("status"), "ACTIVE"));
                cq.orderBy(cb.desc(discountSub), cb.desc(root.get("id")));
            }
            case "name", "name-asc" -> {
                cq.orderBy(cb.asc(root.get("name")), cb.asc(root.get("id")));
            }
            case "name-desc" -> {
                cq.orderBy(cb.desc(root.get("name")), cb.desc(root.get("id")));
            }
            default -> {
                cq.orderBy(cb.desc(root.get("id")));
            }
        }
    }
}
