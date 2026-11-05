package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.CartItemRequest;
import com.re.greenphone.dto.request.CartSyncRequest;
import com.re.greenphone.dto.response.CartDTO;
import com.re.greenphone.entity.Cart;
import com.re.greenphone.entity.CartItem;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.CartMapper;
import com.re.greenphone.repository.CartRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final CartMapper cartMapper;

    public CartDTO getCart() {
        User user = getUser();
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> createCart(user));
        return cartMapper.toDto(cart);
    }

    /**
     * BE2-01: Sync and merge client guest cart with the authenticated user's database cart.
     * Rule: Never exceed available stockQuantity, never drop existing user items, and accumulate quantities.
     */
    public CartDTO syncCart(CartSyncRequest request) {
        User user = getUser();
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> createCart(user));

        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return cartMapper.toDto(cart);
        }

        for (CartItemRequest itemReq : request.getItems()) {
            if (itemReq.getPhoneVariantId() == null) {
                continue;
            }
            int incomingQty = itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1;

            PhoneVariant variant = phoneVariantRepository.findById(itemReq.getPhoneVariantId())
                    .orElse(null);
            if (variant == null || !"ACTIVE".equalsIgnoreCase(variant.getStatus())) {
                log.warn("Variant {} not found or inactive, skipping sync", itemReq.getPhoneVariantId());
                continue;
            }

            int stock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            if (stock <= 0) {
                log.warn("Variant {} is out of stock (stock={}), skipping sync", variant.getId(), stock);
                continue;
            }

            var existingItemOpt = cart.getCartItems().stream()
                    .filter(i -> i.getPhoneVariant().getId().equals(variant.getId()))
                    .findFirst();

            if (existingItemOpt.isPresent()) {
                CartItem existingItem = existingItemOpt.get();
                int combinedQty = existingItem.getQuantity() + incomingQty;
                // Cap at available stock to strictly prevent overselling while preserving items
                int finalQty = Math.min(combinedQty, stock);
                if (finalQty > 0) {
                    existingItem.setQuantity(finalQty);
                }
            } else {
                int finalQty = Math.min(incomingQty, stock);
                if (finalQty > 0) {
                    CartItem newItem = CartItem.builder()
                            .cart(cart)
                            .phoneVariant(variant)
                            .quantity(finalQty)
                            .build();
                    cart.getCartItems().add(newItem);
                }
            }
        }

        Cart savedCart = cartRepository.save(cart);
        return cartMapper.toDto(savedCart);
    }

    public CartDTO addItem(CartItemRequest request) {
        User user = getUser();
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> createCart(user));

        PhoneVariant variant = phoneVariantRepository.findById(request.getPhoneVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", request.getPhoneVariantId()));

        if (variant.getStockQuantity() != null && variant.getStockQuantity() < request.getQuantity()) {
            throw new BadRequestException("Insufficient stock");
        }

        // Check if item already exists
        cart.getCartItems().stream()
                .filter(i -> i.getPhoneVariant().getId().equals(request.getPhoneVariantId()))
                .findFirst()
                .ifPresentOrElse(
                        existing -> existing.setQuantity(existing.getQuantity() + request.getQuantity()),
                        () -> {
                            CartItem item = CartItem.builder()
                                    .cart(cart)
                                    .phoneVariant(variant)
                                    .quantity(request.getQuantity())
                                    .build();
                            cart.getCartItems().add(item);
                        });

        Cart savedCart = cartRepository.save(cart);
        return cartMapper.toDto(savedCart);
    }

    public CartDTO updateItem(Long itemId, int quantity) {
        User user = getUser();
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

        CartItem item = cart.getCartItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", "id", itemId));

        if (quantity <= 0) {
            cart.getCartItems().remove(item);
        } else {
            PhoneVariant variant = item.getPhoneVariant();
            if (variant.getStockQuantity() != null && variant.getStockQuantity() < quantity) {
                throw new BadRequestException("Insufficient stock");
            }
            item.setQuantity(quantity);
        }

        Cart savedCart = cartRepository.save(cart);
        return cartMapper.toDto(savedCart);
    }

    public CartDTO removeItem(Long itemId) {
        return updateItem(itemId, 0);
    }

    public void clearCart() {
        User user = getUser();
        cartRepository.findByUserId(user.getId()).ifPresent(cart -> {
            cart.getCartItems().clear();
            cartRepository.save(cart);
        });
    }

    private User getUser() {
        return userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", SecurityUtils.getCurrentUserId()));
    }

    private Cart createCart(User user) {
        Cart cart = Cart.builder().user(user).build();
        return cartRepository.save(cart);
    }
}
