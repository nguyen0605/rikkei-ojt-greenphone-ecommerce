package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.request.ForgotPasswordRequest;
import com.re.greenphone.dto.request.LoginRequest;
import com.re.greenphone.dto.request.RefreshTokenRequest;
import com.re.greenphone.dto.request.RegisterRequest;
import com.re.greenphone.dto.request.ResendOtpRequest;
import com.re.greenphone.dto.request.ResetPasswordRequest;
import com.re.greenphone.dto.request.VerifyOtpRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Authentication endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthResponse authResponse = authService.login(request, httpRequest);
        setRefreshTokenCookie(httpResponse, authResponse.getRefreshToken(), 604800L);
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    public ResponseEntity<ApiResponse<AuthResponse>> login(LoginRequest request, HttpServletRequest httpRequest) {
        return login(request, httpRequest, null);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<?>> me() {
        return ResponseEntity.ok(ApiResponse.success(authService.getCurrentUser()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest request,
            @CookieValue(name = "refreshToken", required = false) String cookieRefreshToken,
            HttpServletResponse httpResponse) {
        String tokenToRefresh = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        if (tokenToRefresh == null || tokenToRefresh.isBlank()) {
            throw new BadRequestException("Refresh token is required");
        }

        AuthResponse authResponse = authService.refreshToken(tokenToRefresh);
        setRefreshTokenCookie(httpResponse, authResponse.getRefreshToken(), 604800L);
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(RefreshTokenRequest request) {
        return refreshToken(request, null, null);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletResponse httpResponse) {
        authService.logout(authHeader);
        clearRefreshTokenCookie(httpResponse);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    public ResponseEntity<ApiResponse<String>> logout(String authHeader) {
        return logout(authHeader, null);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOTP(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletResponse httpResponse) {
        AuthResponse authResponse = authService.verifyOTP(request.getEmail(), request.getOtp());
        setRefreshTokenCookie(httpResponse, authResponse.getRefreshToken(), 604800L);
        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    public ResponseEntity<ApiResponse<AuthResponse>> verifyOTP(VerifyOtpRequest request) {
        return verifyOTP(request, null);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<String>> resendOTP(@Valid @RequestBody ResendOtpRequest request) {
        authService.resendOTP(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("OTP sent to email"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("OTP sent to email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<AuthResponse>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletResponse httpResponse) {
        AuthResponse response = authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        setRefreshTokenCookie(httpResponse, response.getRefreshToken(), 604800L);
        return ResponseEntity.ok(ApiResponse.success(response, "Password reset successfully"));
    }

    public ResponseEntity<ApiResponse<AuthResponse>> resetPassword(ResetPasswordRequest request) {
        return resetPassword(request, null);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken, long ttlSeconds) {
        if (response == null || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(false) // Allow HTTP during local development
                .path("/")
                .maxAge(Duration.ofSeconds(ttlSeconds > 0 ? ttlSeconds : 604800L))
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        if (response == null) {
            return;
        }
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
