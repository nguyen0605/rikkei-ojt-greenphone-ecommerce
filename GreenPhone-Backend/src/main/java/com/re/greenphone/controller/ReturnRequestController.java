package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.ReturnCreateRequest;
import com.re.greenphone.dto.response.ReturnResponse;
import com.re.greenphone.service.R2StorageService;
import com.re.greenphone.service.ReturnRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// [WAR-04] Controller tiếp nhận và xử lý yêu cầu đổi trả / hoàn tiền từ phía khách hàng
@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
@Tag(name = "Customer Return & Refund", description = "API tiếp nhận yêu cầu đổi trả sản phẩm lỗi trong 7 ngày")
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;
    private final R2StorageService r2StorageService;

    // Khách hàng gửi yêu cầu đổi trả hoặc hoàn tiền cho sản phẩm lỗi trong vòng 7 ngày
    @PostMapping
    @Operation(summary = "Tạo yêu cầu đổi trả hoặc hoàn tiền cho sản phẩm lỗi trong 7 ngày")
    public ResponseEntity<ApiResponse<ReturnResponse>> createReturnRequest(
            @Valid @RequestBody ReturnCreateRequest request) {
        ReturnResponse response = returnRequestService.createReturnRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(response));
    }

    // Tải ảnh chứng minh lỗi sản phẩm lên kho lưu trữ đám mây Cloudflare R2
    @PostMapping(value = "/proof-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload hình ảnh minh chứng lỗi thiết bị lên Cloudflare R2")
    public ResponseEntity<ApiResponse<String>> uploadProofImage(
            @RequestParam("file") MultipartFile file) {
        String imageUrl = r2StorageService.uploadImage(file, "greenphone/returns");
        return ResponseEntity.ok(ApiResponse.success(imageUrl, "Tải ảnh minh chứng lỗi lên Cloudflare R2 thành công"));
    }

    // Lấy danh sách toàn bộ các yêu cầu đổi trả của khách hàng đang đăng nhập
    @GetMapping("/my-requests")
    @Operation(summary = "Lấy danh sách yêu cầu đổi trả của khách hàng hiện tại")
    public ResponseEntity<ApiResponse<List<ReturnResponse>>> getMyReturnRequests() {
        List<ReturnResponse> list = returnRequestService.getMyReturnRequests();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // Xem chi tiết một yêu cầu đổi trả theo ID
    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết yêu cầu đổi trả theo ID")
    public ResponseEntity<ApiResponse<ReturnResponse>> getReturnDetail(@PathVariable Long id) {
        ReturnResponse detail = returnRequestService.getReturnDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}

