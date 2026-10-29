package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.CartItemRequest;
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
