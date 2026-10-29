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
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.OrderDetailRepository;
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

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReviewService {

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

        Page<Review> page = reviewRepository.findByPhoneId(phoneId, pageable);
        List<ReviewDTO> dtos = reviewMapper.toDtoList(page.getContent());

        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public Map<String, Object> getReviewSummary(Long phoneId) {
        List<Review> reviews = reviewRepository.findByPhoneId(phoneId);
        double avg = reviews.stream()
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average().orElse(0.0);

        Map<Integer, Long> distribution = reviews.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        r -> r.getRating() != null ? r.getRating() : 0,
                        java.util.stream.Collectors.counting()));

        return Map.of(
                "averageRating", Math.round(avg * 10) / 10.0,
                "totalReviews", reviews.size(),
                "distribution", distribution
        );
    }

    public ReviewDTO createReview(ReviewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        OrderDetail orderDetail = orderDetailRepository.findById(request.getOrderDetailId())
                .orElseThrow(() -> new ResourceNotFoundException("OrderDetail", "id", request.getOrderDetailId()));
        Phone phone = orderDetail.getPhoneVariant().getPhone();

        // Check if user already reviewed this phone
        if (reviewRepository.existsByUserIdAndPhoneId(userId, phone.getId())) {
            throw new BadRequestException("You have already reviewed this product");
        }

        Review review = Review.builder()
                .user(user)
                .phone(phone)
                .orderDetail(orderDetail)
                .rating(request.getRating())
                .content(request.getContent())
                .status("SHOW")
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

        // IMPORTANT: do NOT mutate order.getOrderDetails() — Order.orderDetails has
        // orphanRemoval=true, so removing an element triggers a DELETE on the row
        // (which fails on FK_REVIEW_ORDER_DETAIL when a review exists).
        // Filter at DTO level instead.
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

        // totalElements must reflect the *filtered* count, not the raw
        // DELIVERED-orders count — otherwise the client sees "1" with empty content.
        long total = dtos.size();
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                total, (int) Math.ceil((double) total / page.getSize()), page.isLast());
    }
}
