package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.UserProfileRequest;
import com.re.greenphone.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "User profile endpoints")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<?>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(userService.getProfile()));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<?>> updateProfile(@Valid @RequestBody UserProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateProfile(request)));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<?>> changePassword(@RequestBody Map<String, String> body) {
        userService.changePassword(body.get("oldPassword"), body.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.success("Password changed"));
    }
}
