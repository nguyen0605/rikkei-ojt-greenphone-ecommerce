package com.re.greenphone.service;

import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WishlistAddRequest;
import com.re.greenphone.dto.response.WishlistItemResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.WishlistMapper;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.repository.WishlistRepository;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.impl.WishlistServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private PhoneRepository phoneRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WishlistMapper wishlistMapper;

    @InjectMocks
    private WishlistServiceImpl wishlistService;

    private MockedStatic<SecurityUtils> securityUtilsMock;

    private static final Long USER_ID = 1L;
    private static final Long PHONE_ID = 100L;

    private User testUser;
    private Phone testPhone;
    private Wishlist testWishlist;
    private WishlistItemResponse testResponse;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        testUser = new User();
        testUser.setId(USER_ID);
        testUser.setEmail("user@example.com");

        Brand brand = Brand.builder().name("Apple").build();
        brand.setId(1L);

        PhoneImage imgMain = PhoneImage.builder().imageUrl("https://r2.greenphone.vn/iphone15-main.jpg").isMain(true).build();
        PhoneImage imgSub = PhoneImage.builder().imageUrl("https://r2.greenphone.vn/iphone15-sub.jpg").isMain(false).build();

        PhoneVariant variant1 = PhoneVariant.builder()
                .price(new BigDecimal("30000000"))
                .discountPrice(new BigDecimal("28000000"))
                .stockQuantity(10)
                .status("ACTIVE")
                .build();
        variant1.setId(1L);

        PhoneVariant variant2 = PhoneVariant.builder()
                .price(new BigDecimal("35000000"))
                .discountPrice(new BigDecimal("33000000"))
                .stockQuantity(5)
                .status("ACTIVE")
                .build();
        variant2.setId(2L);

        testPhone = Phone.builder()
                .name("iPhone 15 Pro Max")
                .brand(brand)
                .images(new ArrayList<>(List.of(imgMain, imgSub)))
                .variants(new ArrayList<>(List.of(variant1, variant2)))
                .build();
        testPhone.setId(PHONE_ID);

        testWishlist = Wishlist.builder()
                .id(1L)
                .user(testUser)
                .phone(testPhone)
                .createdAt(LocalDateTime.now())
                .build();

        testResponse = WishlistItemResponse.builder()
                .id(1L)
                .phoneId(PHONE_ID)
                .name("iPhone 15 Pro Max")
                .phoneName("iPhone 15 Pro Max")
                .brandId(1L)
                .brandName("Apple")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
    }

    @Test
    void getWishlist_Success() {
        when(wishlistRepository.findByUserId(USER_ID)).thenReturn(List.of(testWishlist));
        when(wishlistMapper.toDto(testWishlist)).thenReturn(testResponse);

        List<WishlistItemResponse> result = wishlistService.getWishlist();

        assertNotNull(result);
        assertEquals(1, result.size());
        WishlistItemResponse item = result.get(0);
        assertEquals(PHONE_ID, item.getPhoneId());
        assertEquals("https://r2.greenphone.vn/iphone15-main.jpg", item.getImageUrl());
        assertEquals(new BigDecimal("28000000"), item.getPrice());
        assertEquals(new BigDecimal("30000000"), item.getOriginalPrice());
        assertTrue(item.getInStock());

        verify(wishlistRepository, times(1)).findByUserId(USER_ID);
    }

    @Test
    void getWishlist_Empty() {
        when(wishlistRepository.findByUserId(USER_ID)).thenReturn(List.of());

        List<WishlistItemResponse> result = wishlistService.getWishlist();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(wishlistRepository, times(1)).findByUserId(USER_ID);
    }

    @Test
    void addToWishlist_Success_WithRequest() {
        WishlistAddRequest request = new WishlistAddRequest(PHONE_ID);

        when(phoneRepository.findById(PHONE_ID)).thenReturn(Optional.of(testPhone));
        when(wishlistRepository.existsByUserIdAndPhoneId(USER_ID, PHONE_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
        when(wishlistRepository.save(any(Wishlist.class))).thenReturn(testWishlist);
        when(wishlistMapper.toDto(testWishlist)).thenReturn(testResponse);

        WishlistItemResponse result = wishlistService.addToWishlist(request);

        assertNotNull(result);
        assertEquals(PHONE_ID, result.getPhoneId());
        assertEquals("https://r2.greenphone.vn/iphone15-main.jpg", result.getImageUrl());
        assertEquals(new BigDecimal("28000000"), result.getPrice());
        verify(wishlistRepository, times(1)).save(any(Wishlist.class));
    }

    @Test
    void addToWishlist_Success_WithPhoneId() {
        when(phoneRepository.findById(PHONE_ID)).thenReturn(Optional.of(testPhone));
        when(wishlistRepository.existsByUserIdAndPhoneId(USER_ID, PHONE_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
        when(wishlistRepository.save(any(Wishlist.class))).thenReturn(testWishlist);
        when(wishlistMapper.toDto(testWishlist)).thenReturn(testResponse);

        WishlistItemResponse result = wishlistService.addToWishlist(PHONE_ID);

        assertNotNull(result);
        assertEquals(PHONE_ID, result.getPhoneId());
        verify(wishlistRepository, times(1)).save(any(Wishlist.class));
    }

    @Test
    void addToWishlist_PhoneNotFound_ThrowsResourceNotFoundException() {
        when(phoneRepository.findById(PHONE_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> wishlistService.addToWishlist(PHONE_ID));
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    void addToWishlist_Duplicate_ThrowsConflictException() {
        when(phoneRepository.findById(PHONE_ID)).thenReturn(Optional.of(testPhone));
        when(wishlistRepository.existsByUserIdAndPhoneId(USER_ID, PHONE_ID)).thenReturn(true);

        assertThrows(ConflictException.class, () -> wishlistService.addToWishlist(PHONE_ID));
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    void addToWishlist_UserNotFound_ThrowsResourceNotFoundException() {
        when(phoneRepository.findById(PHONE_ID)).thenReturn(Optional.of(testPhone));
        when(wishlistRepository.existsByUserIdAndPhoneId(USER_ID, PHONE_ID)).thenReturn(false);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> wishlistService.addToWishlist(PHONE_ID));
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    void addToWishlist_NullRequest_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> wishlistService.addToWishlist((WishlistAddRequest) null));
    }

    @Test
    void removeFromWishlist_Success() {
        when(phoneRepository.existsById(PHONE_ID)).thenReturn(true);
        doNothing().when(wishlistRepository).deleteByUserIdAndPhoneId(USER_ID, PHONE_ID);

        assertDoesNotThrow(() -> wishlistService.removeFromWishlist(PHONE_ID));
        verify(wishlistRepository, times(1)).deleteByUserIdAndPhoneId(USER_ID, PHONE_ID);
    }

    @Test
    void removeFromWishlist_PhoneNotFound_ThrowsResourceNotFoundException() {
        when(phoneRepository.existsById(PHONE_ID)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> wishlistService.removeFromWishlist(PHONE_ID));
        verify(wishlistRepository, never()).deleteByUserIdAndPhoneId(any(), any());
    }
}
