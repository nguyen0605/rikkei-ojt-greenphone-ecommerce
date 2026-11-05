package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.ReviewRequest;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.dto.response.ReviewDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.Review;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.mapper.ReviewMapper;
import com.re.greenphone.repository.OrderDetailRepository;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.ReviewRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReviewService {

    private static final List<String> PUBLIC_STATUSES = List.of("APPROVED", "SHOW");

    private final OrderDetailRepository orderDetailRepository;
    private final ReviewRepository reviewRepository;
    private final PhoneRepository phoneRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final ReviewMapper reviewMapper;

    public PageResponse<ReviewDTO> getReviewsByPhoneId(Long phoneId, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Review> page = reviewRepository.findByPhoneIdAndStatusIn(phoneId, PUBLIC_STATUSES, pageable);
        List<ReviewDTO> dtos = reviewMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public Map<String, Object> getReviewSummary(Long phoneId) {
        List<Review> reviews = reviewRepository.findByPhoneIdAndStatusIn(phoneId, PUBLIC_STATUSES);
        double avg = reviews.isEmpty() ? 0.0 : reviews.stream()
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average().orElse(0.0);

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        for (Review r : reviews) {
            if (r.getRating() != null && r.getRating() >= 1 && r.getRating() <= 5) {
                distribution.put(r.getRating(), distribution.get(r.getRating()) + 1L);
            }
        }

        return Map.of(
                "averageRating", Math.round(avg * 10.0) / 10.0,
                "totalReviews", reviews.size(),
                "distribution", distribution
        );
    }

    public ReviewDTO createReview(ReviewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        OrderDetail orderDetail;
        if (request.getOrderDetailId() != null) {
            orderDetail = orderDetailRepository.findById(request.getOrderDetailId())
                    .orElseThrow(() -> new ResourceNotFoundException("OrderDetail", "id", request.getOrderDetailId()));

            Order order = orderDetail.getOrder();
            if (order == null || order.getUser() == null || !order.getUser().getId().equals(userId)
                    || !"DELIVERED".equalsIgnoreCase(order.getOrderStatus())) {
                throw new BadRequestException("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
            }

            if (request.getPhoneId() != null) {
                Phone phone = (orderDetail.getPhoneVariant() != null) ? orderDetail.getPhoneVariant().getPhone() : null;
                if (phone == null || !phone.getId().equals(request.getPhoneId())) {
                    throw new BadRequestException("Chi tiết đơn hàng không khớp với sản phẩm.");
                }
            }
        } else if (request.getPhoneId() != null) {
            phoneRepository.findById(request.getPhoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", request.getPhoneId()));

            List<Order> deliveredOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                    .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
                    .toList();

            OrderDetail eligibleDetail = null;
            for (Order o : deliveredOrders) {
                if (reviewRepository.existsByOrderIdAndPhoneId(o.getId(), request.getPhoneId())) {
                    continue;
                }
                if (o.getOrderDetails() != null) {
                    for (OrderDetail od : o.getOrderDetails()) {
                        if (od.getPhoneVariant() != null && od.getPhoneVariant().getPhone() != null
                                && od.getPhoneVariant().getPhone().getId().equals(request.getPhoneId())) {
                            if (!reviewRepository.existsByOrderDetailId(od.getId())) {
                                eligibleDetail = od;
                                break;
                            }
                        }
                    }
                }
                if (eligibleDetail != null) {
                    break;
                }
            }

            if (eligibleDetail == null) {
                throw new BadRequestException("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
            }
            orderDetail = eligibleDetail;
        } else {
            throw new BadRequestException("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
        }

        Phone phone = orderDetail.getPhoneVariant() != null ? orderDetail.getPhoneVariant().getPhone() : null;
        if (phone == null) {
            throw new BadRequestException("Sản phẩm không hợp lệ.");
        }

        // Anti-duplicate / Anti-spam checks
        if (reviewRepository.existsByOrderDetailId(orderDetail.getId())) {
            throw new BadRequestException("Chi tiết đơn hàng này đã được đánh giá.");
        }

        Order order = orderDetail.getOrder();
        if (order != null && reviewRepository.existsByOrderIdAndPhoneId(order.getId(), phone.getId())) {
            throw new BadRequestException("Đơn hàng này đã được đánh giá cho sản phẩm này.");
        }

        Review review = Review.builder()
                .user(user)
                .phone(phone)
                .orderDetail(orderDetail)
                .rating(request.getRating())
                .content(request.getContent())
                .status("APPROVED")
                .build();

        review = reviewRepository.save(review);
        reviewRepository.flush();

        return reviewMapper.toDto(review);
    }

    public ReviewDTO updateReview(Long reviewId, ReviewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        if (!review.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot update another user's review");
        }

        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review = reviewRepository.save(review);
        return reviewMapper.toDto(review);
    }

    public void deleteReview(Long reviewId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));

        if (!review.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cannot delete another user's review");
        }

        reviewRepository.delete(review);
    }

    public PageResponse<ReviewDTO> getMyReviews(PageRequest pageRequest) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize());

        Page<Review> page = reviewRepository.findByUserId(userId, pageable);
        List<ReviewDTO> dtos = reviewMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    /**
     * Returns DELIVERED orders of the current user whose order details still
     * have no review — these are the products the user can review.
     *
     * NOTE: reviewed status is derived via reviewRepository.existsByOrderDetailId
     * instead of navigating OrderDetail.review (a @OneToOne mappedBy) — the
     * reverse side is not managed by Hibernate, so reading it can throw
     * TransientPropertyValueException.
     */
    public PageResponse<OrderDTO> getEligibleForReview(PageRequest pageRequest) {
        Long userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> page = orderRepository.findByUserIdAndOrderStatus(userId, "DELIVERED", pageable);

        // Filter at DTO level instead of mutating entity collection
        List<OrderDTO> dtos = orderMapper.toDtoList(page.getContent()).stream()
                .map(orderDto -> {
                    if (orderDto.getOrderDetails() != null) {
                        orderDto.setOrderDetails(orderDto.getOrderDetails().stream()
                                .filter(od -> !reviewRepository.existsByOrderDetailId(od.getId()))
                                .toList());
                    }
                    return orderDto;
                })
                .filter(o -> !o.getOrderDetails().isEmpty())
                .toList();

        long total = dtos.size();
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                total, (int) Math.ceil((double) total / page.getSize()), page.isLast());
    }
}
