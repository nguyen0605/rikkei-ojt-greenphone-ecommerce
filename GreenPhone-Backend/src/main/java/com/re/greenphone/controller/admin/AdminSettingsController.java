package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.entity.Settings;
import com.re.greenphone.service.SettingsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@Tag(name = "Admin Settings", description = "Admin-only shop settings management")
public class AdminSettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Settings>>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(settingsService.findAll()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> updateSettings(
            @RequestBody Map<String, String> values) {
        return ResponseEntity.ok(ApiResponse.success(settingsService.updateSettings(values)));
    }
}
