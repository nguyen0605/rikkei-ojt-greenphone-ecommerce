package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.WishlistAddRequest;
import com.re.greenphone.dto.response.WishlistItemResponse;
import com.re.greenphone.service.WishlistService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistControllerTest {

    @Mock
    private WishlistService wishlistService;

    @InjectMocks
    private WishlistController controller;

    @Test
    void getWishlist_Returns200WithList() {
        WishlistItemResponse item = WishlistItemResponse.builder()
                .id(1L)
                .phoneId(10L)
                .name("iPhone 15 Pro Max")
                .price(new BigDecimal("29000000"))
                .imageUrl("https://r2.greenphone.vn/iphone15.jpg")
                .createdAt(LocalDateTime.now())
                .build();
        when(wishlistService.getWishlist()).thenReturn(List.of(item));

        ResponseEntity<ApiResponse<List<WishlistItemResponse>>> response = controller.getWishlist();

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(200, response.getBody().getCode());
        assertEquals(1, response.getBody().getData().size());
        verify(wishlistService, times(1)).getWishlist();
    }

    @Test
    void addToWishlist_Returns200WithItem() {
        WishlistAddRequest req = new WishlistAddRequest(10L);
        WishlistItemResponse item = WishlistItemResponse.builder()
                .id(1L)
                .phoneId(10L)
                .name("iPhone 15 Pro Max")
                .build();
        when(wishlistService.addToWishlist(req)).thenReturn(item);

        ResponseEntity<ApiResponse<WishlistItemResponse>> response = controller.addToWishlist(req);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(10L, response.getBody().getData().getPhoneId());
        verify(wishlistService, times(1)).addToWishlist(req);
    }

    @Test
    void addToWishlistByPath_Returns200WithItem() {
        WishlistItemResponse item = WishlistItemResponse.builder()
                .id(1L)
                .phoneId(10L)
                .name("iPhone 15 Pro Max")
                .build();
        when(wishlistService.addToWishlist(10L)).thenReturn(item);

        ResponseEntity<ApiResponse<WishlistItemResponse>> response = controller.addToWishlistByPath(10L);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(10L, response.getBody().getData().getPhoneId());
        verify(wishlistService, times(1)).addToWishlist(10L);
    }

    @Test
    void removeFromWishlist_Returns200Success() {
        doNothing().when(wishlistService).removeFromWishlist(10L);

        ResponseEntity<ApiResponse<String>> response = controller.removeFromWishlist(10L);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Removed from wishlist", response.getBody().getData());
        verify(wishlistService, times(1)).removeFromWishlist(10L);
    }
}
