package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.dto.request.OptionItemRequest;
import com.re.greenphone.dto.request.OptionRequest;
import com.re.greenphone.service.admin.AdminOptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/options")
@RequiredArgsConstructor
@Tag(name = "Admin - Option", description = "Admin option categories and items CRUD")
public class AdminOptionController {

    private final AdminOptionService adminOptionService;

    // ---- Categories ----

    @GetMapping
    public ResponseEntity<ApiResponse<?>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.getCategories()));
    }

    @GetMapping("/types")
    public ResponseEntity<ApiResponse<?>> getTypes() {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.getTypes()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<?>> createCategory(@Valid @RequestBody OptionRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.created(adminOptionService.createCategory(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> updateCategory(@PathVariable Long id, @Valid @RequestBody OptionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.updateCategory(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> deleteCategory(@PathVariable Long id) {
        adminOptionService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted"));
    }

    // ---- Items ----

    @GetMapping("/{optionId}/items")
    public ResponseEntity<ApiResponse<?>> getItems(@PathVariable Long optionId) {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.getItems(optionId)));
    }

    @PostMapping("/{optionId}/items")
    public ResponseEntity<ApiResponse<?>> createItem(@PathVariable Long optionId, @Valid @RequestBody OptionItemRequest request) {
        request.setOptionId(optionId);
        return ResponseEntity.status(201).body(ApiResponse.created(adminOptionService.createItem(request)));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<?>> updateItem(@PathVariable Long id, @Valid @RequestBody OptionItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.updateItem(id, request)));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<?>> deleteItem(@PathVariable Long id) {
        adminOptionService.deleteItem(id);
        return ResponseEntity.ok(ApiResponse.success("Item deleted"));
    }

    @GetMapping("/items/{id}/usage")
    public ResponseEntity<ApiResponse<?>> getItemUsage(@PathVariable Long id, PageRequest pageRequest) {
        return ResponseEntity.ok(ApiResponse.success(adminOptionService.findItemUsage(id, pageRequest)));
    }
}
