package com.re.greenphone.service;

import com.re.greenphone.dto.request.WishlistAddRequest;
import com.re.greenphone.dto.response.WishlistItemResponse;

import java.util.List;

public interface WishlistService {

    List<WishlistItemResponse> getWishlist();

    WishlistItemResponse addToWishlist(WishlistAddRequest request);

    WishlistItemResponse addToWishlist(Long phoneId);

    void removeFromWishlist(Long phoneId);
}
