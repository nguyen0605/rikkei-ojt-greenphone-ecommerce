package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.ReviewDTO;
import com.re.greenphone.entity.Review;
import com.re.greenphone.mapper.ReviewMapper;
import com.re.greenphone.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;

    public PageResponse<ReviewDTO> getReviews(String status, Integer rating, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Review> page;
        if (status != null && !status.isBlank() && rating != null) {
            page = reviewRepository.findByStatusAndRating(status, rating, pageable);
        } else if (status != null && !status.isBlank()) {
            page = reviewRepository.findByStatus(status, pageable);
        } else if (rating != null) {
            page = reviewRepository.findByRating(rating, pageable);
        } else {
            page = reviewRepository.findAll(pageable);
        }
        List<ReviewDTO> dtos = reviewMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public ReviewDTO updateStatus(Long id, String status) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", id));
        review.setStatus(status);
        review = reviewRepository.save(review);
        return reviewMapper.toDto(review);
    }

    public void deleteReview(Long id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", id));
        reviewRepository.delete(review);
    }
}
