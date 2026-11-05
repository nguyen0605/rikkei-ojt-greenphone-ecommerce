package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.ForgotPasswordRequest;
import com.re.greenphone.dto.request.ResendOtpRequest;
import com.re.greenphone.dto.request.ResetPasswordRequest;
import com.re.greenphone.dto.request.VerifyOtpRequest;
import com.re.greenphone.dto.response.AuthResponse;
import com.re.greenphone.service.AuthService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController controller;

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void verifyOTP_Success_DelegatesToAuthService() {
        var req = VerifyOtpRequest.builder().email("user@example.com").otp("123456").build();
        var authResponse = new AuthResponse(1L, "jwt_token", "User Name", "user@example.com", "CUSTOMER", 3600L);
        when(authService.verifyOTP("user@example.com", "123456")).thenReturn(authResponse);

        ResponseEntity<ApiResponse<AuthResponse>> response = controller.verifyOTP(req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isSameAs(authResponse);
        verify(authService).verifyOTP("user@example.com", "123456");
    }

    @Test
    void verifyOTP_Validation_RejectsInvalidEmailAndOtp() {
        var invalidReq = VerifyOtpRequest.builder().email("not-an-email").otp("12a").build();
        Set<ConstraintViolation<VerifyOtpRequest>> violations = validator.validate(invalidReq);

        assertThat(violations).hasSize(2);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("otp"));
    }

    @Test
    void resendOTP_Success_DelegatesToAuthService() {
        var req = ResendOtpRequest.builder().email("user@example.com").build();

        ResponseEntity<ApiResponse<String>> response = controller.resendOTP(req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(authService).resendOTP("user@example.com");
    }

    @Test
    void resendOTP_Validation_RejectsBlankEmail() {
        var invalidReq = ResendOtpRequest.builder().email("").build();
        Set<ConstraintViolation<ResendOtpRequest>> violations = validator.validate(invalidReq);

        assertThat(violations).isNotEmpty();
    }

    @Test
    void forgotPassword_Success_DelegatesToAuthService() {
        var req = ForgotPasswordRequest.builder().email("user@example.com").build();

        ResponseEntity<ApiResponse<String>> response = controller.forgotPassword(req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(authService).forgotPassword("user@example.com");
    }

    @Test
    void resetPassword_Success_DelegatesToAuthService() {
        var req = ResetPasswordRequest.builder()
                .email("user@example.com")
                .otp("654321")
                .newPassword("newSecr3t")
                .build();

        ResponseEntity<ApiResponse<String>> response = controller.resetPassword(req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(authService).resetPassword("user@example.com", "654321", "newSecr3t");
    }

    @Test
    void resetPassword_Validation_RejectsShortPasswordAndBadOtp() {
        var invalidReq = ResetPasswordRequest.builder()
                .email("user@example.com")
                .otp("123")
                .newPassword("123")
                .build();
        Set<ConstraintViolation<ResetPasswordRequest>> violations = validator.validate(invalidReq);

        assertThat(violations).hasSize(2);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("otp"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("newPassword"));
    }
}
