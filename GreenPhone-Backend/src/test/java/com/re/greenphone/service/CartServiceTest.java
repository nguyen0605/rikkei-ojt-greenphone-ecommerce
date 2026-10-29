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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private CartMapper cartMapper;

    @InjectMocks
    private CartService cartService;

    private MockedStatic<SecurityUtils> securityUtilsMock;

    private static final Long USER_ID = 1L;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
    }

    // -----------------------------------------------------------------------
    // Helper methods
    // -----------------------------------------------------------------------

    private User createUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setEmail("test@test.com");
        return user;
    }

    private PhoneVariant createVariant(Long id, Integer stock) {
        PhoneVariant variant = PhoneVariant.builder()
                .price(new BigDecimal("1000.00"))
                .stockQuantity(stock)
                .build();
        variant.setId(id);
        return variant;
    }

    private CartItem createCartItem(Long id, Cart cart, PhoneVariant variant, int quantity) {
        CartItem item = CartItem.builder()
                .cart(cart)
                .phoneVariant(variant)
                .quantity(quantity)
                .build();
        item.setId(id);
        return item;
    }

    private void stubCurrentUser(User user) {
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
    }

    // ======================================================================
    // 1. addItem_NewItem — adds a new variant to an empty cart
    // ======================================================================
    @Test
    void addItem_NewItem() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItemRequest request = CartItemRequest.builder()
                .phoneVariantId(100L)
                .quantity(2)
                .build();

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(phoneVariantRepository.findById(100L)).thenReturn(Optional.of(variant));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.addItem(request);

        // Then
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(1, cart.getCartItems().size());

        CartItem addedItem = cart.getCartItems().get(0);
        assertEquals(variant, addedItem.getPhoneVariant());
        assertEquals(2, addedItem.getQuantity());
        assertEquals(cart, addedItem.getCart());

        verify(cartRepository).save(cart);
        verify(cartMapper).toDto(cart);
        verify(phoneVariantRepository).findById(100L);
    }

    // ======================================================================
    // 2. addItem_ExistingItem — increases quantity when same variant
    // ======================================================================
    @Test
    void addItem_ExistingItem() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem existingItem = createCartItem(1L, cart, variant, 1);
        cart.getCartItems().add(existingItem);

        CartItemRequest request = CartItemRequest.builder()
                .phoneVariantId(100L)
                .quantity(2)
                .build();

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(phoneVariantRepository.findById(100L)).thenReturn(Optional.of(variant));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        cartService.addItem(request);

        // Then
        assertEquals(1, cart.getCartItems().size()); // still one line item
        assertEquals(3, existingItem.getQuantity());  // 1 + 2 = 3

        verify(cartRepository).save(cart);
    }

    // ======================================================================
    // 3. addItem_InsufficientStock — throws BadRequestException
    // ======================================================================
    @Test
    void addItem_InsufficientStock() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 1);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItemRequest request = CartItemRequest.builder()
                .phoneVariantId(100L)
                .quantity(2)
                .build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(phoneVariantRepository.findById(100L)).thenReturn(Optional.of(variant));

        // When / Then
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> cartService.addItem(request));
        assertTrue(ex.getMessage().contains("Insufficient stock"));

        // Cart must NOT be saved
        verify(cartRepository, never()).save(any());
        verify(cartMapper, never()).toDto(any());
    }

    // ======================================================================
    // 4. addItem_VariantNotFound — throws ResourceNotFoundException
    // ======================================================================
    @Test
    void addItem_VariantNotFound() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItemRequest request = CartItemRequest.builder()
                .phoneVariantId(999L)
                .quantity(1)
                .build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(phoneVariantRepository.findById(999L)).thenReturn(Optional.empty());

        // When / Then
        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> cartService.addItem(request));
        assertTrue(ex.getMessage().contains("PhoneVariant"));

        verify(cartRepository, never()).save(any());
        verify(cartMapper, never()).toDto(any());
    }

    // ======================================================================
    // 5. updateItem_Increase — updates quantity
    // ======================================================================
    @Test
    void updateItem_Increase() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem item = createCartItem(1L, cart, variant, 1);
        cart.getCartItems().add(item);

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.updateItem(1L, 5);

        // Then
        assertNotNull(result);
        assertEquals(1, cart.getCartItems().size());
        assertEquals(5, item.getQuantity());

        verify(cartRepository).save(cart);
    }

    // ======================================================================
    // 6. updateItem_ExceedStock — throws BadRequestException
    // ======================================================================
    @Test
    void updateItem_ExceedStock() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 3);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem item = createCartItem(1L, cart, variant, 1);
        cart.getCartItems().add(item);

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));

        // When / Then
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> cartService.updateItem(1L, 10));
        assertTrue(ex.getMessage().contains("Insufficient stock"));

        // Quantity should remain unchanged
        assertEquals(1, item.getQuantity());
        verify(cartRepository, never()).save(any());
        verify(cartMapper, never()).toDto(any());
    }

    // ======================================================================
    // 7. updateItem_ZeroQuantity — removes item from cart
    // ======================================================================
    @Test
    void updateItem_ZeroQuantity() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem item = createCartItem(1L, cart, variant, 2);
        cart.getCartItems().add(item);

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.updateItem(1L, 0);

        // Then
        assertNotNull(result);
        assertTrue(cart.getCartItems().isEmpty());

        verify(cartRepository).save(cart);
    }

    // ======================================================================
    // 8. removeItem — delegates to updateItem with quantity 0
    // ======================================================================
    @Test
    void removeItem() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem item = createCartItem(1L, cart, variant, 2);
        cart.getCartItems().add(item);

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.removeItem(1L);

        // Then
        assertNotNull(result);
        assertTrue(cart.getCartItems().isEmpty());

        verify(cartRepository).save(cart);
    }

    // ======================================================================
    // 9. getCart_Existing — returns existing cart
    // ======================================================================
    @Test
    void getCart_Existing() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartDTO expectedDto = CartDTO.builder().id(1L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(cartMapper.toDto(cart)).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.getCart();

        // Then
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(USER_ID, result.getUserId());

        // No new cart should be created
        verify(cartRepository, never()).save(any());
        verify(cartMapper).toDto(cart);
    }

    // ======================================================================
    // 10. getCart_CreatesNew — creates cart if none exists
    // ======================================================================
    @Test
    void getCart_CreatesNew() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        CartDTO expectedDto = CartDTO.builder().id(2L).userId(USER_ID).build();

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> {
            Cart c = inv.getArgument(0);
            c.setId(2L);
            return c;
        });
        when(cartMapper.toDto(any(Cart.class))).thenReturn(expectedDto);

        // When
        CartDTO result = cartService.getCart();

        // Then
        assertNotNull(result);
        assertEquals(2L, result.getId());

        verify(cartRepository).save(any(Cart.class));
    }

    // ======================================================================
    // 11. clearCart — clears all items
    // ======================================================================
    @Test
    void clearCart() {
        // Given
        User user = createUser();
        stubCurrentUser(user);

        PhoneVariant variant = createVariant(100L, 10);
        Cart cart = Cart.builder().user(user).build();
        cart.setId(1L);

        CartItem item1 = createCartItem(1L, cart, variant, 2);
        cart.getCartItems().add(item1);

        CartItem item2 = createCartItem(2L, cart, createVariant(101L, 5), 1);
        cart.getCartItems().add(item2);

        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));

        // When
        cartService.clearCart();

        // Then
        assertTrue(cart.getCartItems().isEmpty());
        verify(cartRepository).save(cart);
    }
}
