package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WishlistAddRequest;
import com.re.greenphone.dto.response.WishlistItemResponse;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.User;
import com.re.greenphone.entity.Wishlist;
import com.re.greenphone.mapper.WishlistMapper;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.repository.WishlistRepository;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.WishlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepository wishlistRepository;
    private final PhoneRepository phoneRepository;
    private final UserRepository userRepository;
    private final WishlistMapper wishlistMapper;

    @Override
    @Transactional(readOnly = true)
    public List<WishlistItemResponse> getWishlist() {
        Long userId = SecurityUtils.getCurrentUserId();
        log.info("Fetching wishlist for user ID: {}", userId);
        List<Wishlist> wishlist = wishlistRepository.findByUserId(userId);
        return wishlist.stream()
                .map(item -> enrichDto(wishlistMapper.toDto(item), item.getPhone()))
                .toList();
    }

    @Override
    public WishlistItemResponse addToWishlist(WishlistAddRequest request) {
        if (request == null || request.getPhoneId() == null) {
            throw new IllegalArgumentException("Phone ID cannot be null");
        }
        return addToWishlist(request.getPhoneId());
    }

    @Override
    public WishlistItemResponse addToWishlist(Long phoneId) {
        Long userId = SecurityUtils.getCurrentUserId();
        log.info("Adding phone ID {} to wishlist for user ID: {}", phoneId, userId);

        Phone phone = phoneRepository.findById(phoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Phone not found with id: " + phoneId));

        if (wishlistRepository.existsByUserIdAndPhoneId(userId, phoneId)) {
            throw new ConflictException("Phone already in wishlist");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Wishlist wishlist = Wishlist.builder()
                .user(user)
                .phone(phone)
                .build();

        Wishlist saved = wishlistRepository.save(wishlist);
        return enrichDto(wishlistMapper.toDto(saved), phone);
    }

    @Override
    public void removeFromWishlist(Long phoneId) {
        Long userId = SecurityUtils.getCurrentUserId();
        log.info("Removing phone ID {} from wishlist for user ID: {}", phoneId, userId);

        if (!phoneRepository.existsById(phoneId)) {
            throw new ResourceNotFoundException("Phone not found with id: " + phoneId);
        }

        wishlistRepository.deleteByUserIdAndPhoneId(userId, phoneId);
    }

    private WishlistItemResponse enrichDto(WishlistItemResponse dto, Phone phone) {
        if (dto == null || phone == null) {
            return dto;
        }

        // Cloudflare R2 image representation
        String imageUrl = null;
        if (phone.getImages() != null && !phone.getImages().isEmpty()) {
            imageUrl = phone.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                    .map(PhoneImage::getImageUrl)
                    .findFirst()
                    .orElse(phone.getImages().get(0).getImageUrl());
        }
        dto.setImageUrl(imageUrl);
        dto.setThumbnail(imageUrl);

        // Price: minimum variant price
        if (phone.getVariants() != null && !phone.getVariants().isEmpty()) {
            List<PhoneVariant> activeVariants = phone.getVariants().stream()
                    .filter(v -> "ACTIVE".equalsIgnoreCase(v.getStatus()))
                    .toList();
            if (activeVariants.isEmpty()) {
                activeVariants = phone.getVariants();
            }

            PhoneVariant lowestVariant = activeVariants.stream()
                    .filter(v -> v.getDiscountPrice() != null || v.getPrice() != null)
                    .min(Comparator.comparing(v -> v.getDiscountPrice() != null ? v.getDiscountPrice()
                            : (v.getPrice() != null ? v.getPrice() : BigDecimal.ZERO)))
                    .orElse(null);

            if (lowestVariant != null) {
                BigDecimal effectivePrice = lowestVariant.getDiscountPrice() != null
                        ? lowestVariant.getDiscountPrice()
                        : lowestVariant.getPrice();
                dto.setPrice(effectivePrice);
                if (lowestVariant.getDiscountPrice() != null) {
                    dto.setOriginalPrice(lowestVariant.getPrice());
                }
            }

            boolean inStock = activeVariants.stream()
                    .anyMatch(v -> v.getStockQuantity() != null && v.getStockQuantity() > 0);
            dto.setInStock(inStock);
        } else {
            dto.setInStock(false);
        }

        return dto;
    }
}
