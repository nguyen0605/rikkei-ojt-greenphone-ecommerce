package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.ReviewRequest;
import com.re.greenphone.dto.response.ReviewDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.mapper.ReviewMapper;
import com.re.greenphone.repository.OrderDetailRepository;
import com.re.greenphone.repository.OrderRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.ReviewRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private OrderDetailRepository orderDetailRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private PhoneRepository phoneRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private ReviewMapper reviewMapper;

    @InjectMocks
    private ReviewService reviewService;

    private User testUser;
    private User otherUser;
    private Phone testPhone;
    private PhoneVariant testVariant;
    private Order testOrder;
    private OrderDetail testOrderDetail;
    private Review testReview;
    private ReviewRequest validReviewReq;

    private static OptionItem item(String type, String value) {
        Option option = Option.builder().type(type).label(type).enabled(true).maxItems(5).sortOrder(1).build();
        option.setId(1L);
        return OptionItem.builder().option(option).value(value).sortOrder(1).build();
    }

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");

        otherUser = new User();
        otherUser.setId(2L);
        otherUser.setEmail("other@example.com");

        testPhone = new Phone();
        testPhone.setId(10L);
        testPhone.setName("iPhone 15");

        testVariant = PhoneVariant.builder()
                .phone(testPhone)
                .ramItem(item("RAM", "8GB"))
                .storageItem(item("STORAGE", "256GB"))
                .colorItem(item("COLOR", "Black"))
                .price(new java.math.BigDecimal("25000000"))
                .stockQuantity(50)
                .build();
        testVariant.setId(20L);

        testOrder = Order.builder()
                .user(testUser)
                .orderStatus("DELIVERED")
                .orderDetails(new ArrayList<>())
                .build();
        testOrder.setId(100L);

        testOrderDetail = OrderDetail.builder()
                .order(testOrder)
                .phoneVariant(testVariant)
                .quantity(1)
                .unitPrice(new java.math.BigDecimal("25000000"))
                .build();
        testOrderDetail.setId(30L);

        testOrder.getOrderDetails().add(testOrderDetail);

        testReview = Review.builder()
                .user(testUser)
                .phone(testPhone)
                .orderDetail(testOrderDetail)
                .rating(5)
                .content("Great phone!")
                .status("APPROVED")
                .build();
        testReview.setId(40L);

        validReviewReq = new ReviewRequest();
        validReviewReq.setOrderDetailId(30L);
        validReviewReq.setRating(5);
        validReviewReq.setContent("Great phone!");
    }

    // === CREATE REVIEW ===

    @Test
    void createReview_Success_WithOrderDetailId() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(30L)).thenReturn(Optional.of(testOrderDetail));
            when(reviewRepository.existsByOrderDetailId(30L)).thenReturn(false);
            when(reviewRepository.existsByOrderIdAndPhoneId(100L, 10L)).thenReturn(false);
            when(reviewRepository.save(any(Review.class))).thenReturn(testReview);

            ReviewDTO dto = new ReviewDTO();
            dto.setId(40L);
            dto.setOrderDetailId(30L);
            dto.setStatus("APPROVED");
            dto.setContent("Great phone!");
            when(reviewMapper.toDto(testReview)).thenReturn(dto);

            ReviewDTO result = reviewService.createReview(validReviewReq);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(40L);
            assertThat(result.getStatus()).isEqualTo("APPROVED");
            verify(reviewRepository).save(any(Review.class));
        }
    }

    @Test
    void createReview_Success_WithPhoneIdOnly() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(phoneRepository.findById(10L)).thenReturn(Optional.of(testPhone));
            when(orderRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(testOrder));
            when(reviewRepository.existsByOrderIdAndPhoneId(100L, 10L)).thenReturn(false);
            when(reviewRepository.existsByOrderDetailId(30L)).thenReturn(false);
            when(reviewRepository.save(any(Review.class))).thenReturn(testReview);

            ReviewRequest phoneOnlyReq = ReviewRequest.builder()
                    .phoneId(10L)
                    .rating(5)
                    .content("Phone only review")
                    .build();

            ReviewDTO dto = new ReviewDTO();
            dto.setId(40L);
            dto.setStatus("APPROVED");
            when(reviewMapper.toDto(testReview)).thenReturn(dto);

            ReviewDTO result = reviewService.createReview(phoneOnlyReq);

            assertThat(result).isNotNull();
            verify(reviewRepository).save(any(Review.class));
        }
    }

    @Test
    void createReview_OrderNotDelivered_ThrowsBadRequest() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            testOrder.setOrderStatus("SHIPPING");
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(30L)).thenReturn(Optional.of(testOrderDetail));

            assertThatThrownBy(() -> reviewService.createReview(validReviewReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
        }
    }

    @Test
    void createReview_NotOwnerOfOrder_ThrowsBadRequest() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            testOrder.setUser(otherUser);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(30L)).thenReturn(Optional.of(testOrderDetail));

            assertThatThrownBy(() -> reviewService.createReview(validReviewReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
        }
    }

    @Test
    void createReview_DuplicateOrderDetail_ThrowsBadRequest() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(30L)).thenReturn(Optional.of(testOrderDetail));
            when(reviewRepository.existsByOrderDetailId(30L)).thenReturn(true);

            assertThatThrownBy(() -> reviewService.createReview(validReviewReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Chi tiết đơn hàng này đã được đánh giá.");
        }
    }

    @Test
    void createReview_DuplicateOrderForSamePhone_ThrowsBadRequest() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(30L)).thenReturn(Optional.of(testOrderDetail));
            when(reviewRepository.existsByOrderDetailId(30L)).thenReturn(false);
            when(reviewRepository.existsByOrderIdAndPhoneId(100L, 10L)).thenReturn(true);

            assertThatThrownBy(() -> reviewService.createReview(validReviewReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Đơn hàng này đã được đánh giá cho sản phẩm này.");
        }
    }

    @Test
    void createReview_OrderDetailNotFound() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(orderDetailRepository.findById(999L)).thenReturn(Optional.empty());

            validReviewReq.setOrderDetailId(999L);

            assertThatThrownBy(() -> reviewService.createReview(validReviewReq))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Test
    void createReview_ByPhoneId_NoDeliveredOrder_ThrowsBadRequest() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(phoneRepository.findById(10L)).thenReturn(Optional.of(testPhone));
            when(orderRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

            ReviewRequest phoneOnlyReq = ReviewRequest.builder()
                    .phoneId(10L)
                    .rating(5)
                    .content("Phone only review")
                    .build();

            assertThatThrownBy(() -> reviewService.createReview(phoneOnlyReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Chỉ được đánh giá sản phẩm sau khi đã nhận hàng thành công.");
        }
    }

    // === UPDATE REVIEW ===

    @Test
    void updateReview_Success() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(reviewRepository.findById(40L)).thenReturn(Optional.of(testReview));
            when(reviewRepository.save(any(Review.class))).thenReturn(testReview);

            ReviewDTO dto = new ReviewDTO();
            dto.setId(40L);
            dto.setRating(4);
            dto.setContent("Updated review");
            when(reviewMapper.toDto(testReview)).thenReturn(dto);

            validReviewReq.setRating(4);
            validReviewReq.setContent("Updated review");

            ReviewDTO result = reviewService.updateReview(40L, validReviewReq);

            assertThat(result.getRating()).isEqualTo(4);
        }
    }

    @Test
    void updateReview_CannotUpdateOtherUsersReview() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(2L);
            when(reviewRepository.findById(40L)).thenReturn(Optional.of(testReview));

            assertThatThrownBy(() -> reviewService.updateReview(40L, validReviewReq))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("another user");
        }
    }

    @Test
    void deleteReview_CannotDeleteOtherUsersReview() {
        try (MockedStatic<SecurityUtils> mocked = mockStatic(SecurityUtils.class)) {
            mocked.when(SecurityUtils::getCurrentUserId).thenReturn(2L);
            when(reviewRepository.findById(40L)).thenReturn(Optional.of(testReview));

            assertThatThrownBy(() -> reviewService.deleteReview(40L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("another user");
        }
    }

    // === GET REVIEWS BY PHONE ID ===

    @Test
    void getReviewsByPhoneId_FiltersApprovedAndShow() {
        Page<Review> page = new PageImpl<>(List.of(testReview));
        when(reviewRepository.findByPhoneIdAndStatusIn(eq(10L), eq(List.of("APPROVED", "SHOW")), any(Pageable.class)))
                .thenReturn(page);
        when(reviewMapper.toDtoList(any())).thenReturn(List.of(new ReviewDTO()));

        PageResponse<ReviewDTO> result = reviewService.getReviewsByPhoneId(10L, new PageRequest(0, 10, "id", "desc"));

        assertThat(result.getContent()).hasSize(1);
        verify(reviewRepository).findByPhoneIdAndStatusIn(eq(10L), eq(List.of("APPROVED", "SHOW")), any(Pageable.class));
    }

    // === GET REVIEW SUMMARY ===

    @Test
    void getReviewSummary_CalculatesAverageAndAllDistributionLevels() {
        Review r1 = Review.builder().rating(5).build();
        r1.setId(1L);
        Review r2 = Review.builder().rating(4).build();
        r2.setId(2L);

        when(reviewRepository.findByPhoneIdAndStatusIn(10L, List.of("APPROVED", "SHOW"))).thenReturn(List.of(r1, r2));

        Map<String, Object> summary = reviewService.getReviewSummary(10L);

        assertThat(summary).containsEntry("totalReviews", 2);
        assertThat((Double) summary.get("averageRating")).isEqualTo(4.5);

        @SuppressWarnings("unchecked")
        Map<Integer, Long> distribution = (Map<Integer, Long>) summary.get("distribution");
        assertThat(distribution).isNotNull();
        assertThat(distribution.get(1)).isEqualTo(0L);
        assertThat(distribution.get(2)).isEqualTo(0L);
        assertThat(distribution.get(3)).isEqualTo(0L);
        assertThat(distribution.get(4)).isEqualTo(1L);
        assertThat(distribution.get(5)).isEqualTo(1L);
    }

    @Test
    void getReviewSummary_NoReviews() {
        when(reviewRepository.findByPhoneIdAndStatusIn(10L, List.of("APPROVED", "SHOW"))).thenReturn(List.of());

        Map<String, Object> summary = reviewService.getReviewSummary(10L);

        assertThat(summary).containsEntry("totalReviews", 0);
        assertThat((Double) summary.get("averageRating")).isEqualTo(0.0);

        @SuppressWarnings("unchecked")
        Map<Integer, Long> distribution = (Map<Integer, Long>) summary.get("distribution");
        assertThat(distribution).isNotNull();
        assertThat(distribution.get(1)).isEqualTo(0L);
        assertThat(distribution.get(2)).isEqualTo(0L);
        assertThat(distribution.get(3)).isEqualTo(0L);
        assertThat(distribution.get(4)).isEqualTo(0L);
        assertThat(distribution.get(5)).isEqualTo(0L);
    }
}
