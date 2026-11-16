package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.service.R2StorageService;
import com.re.greenphone.service.ReviewService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    @Mock
    private ReviewService reviewService;

    @Mock
    private R2StorageService r2StorageService;

    @InjectMocks
    private ReviewController reviewController;

    @Test
    @DisplayName("CAT-25: Upload 2 ảnh hợp lệ thành công trả về HTTP 200 kèm danh sách URL công khai R2")
    void uploadImages_Success() {
        MockMultipartFile file1 = new MockMultipartFile(
                "images", "photo1.jpg", "image/jpeg", "fake image 1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "images", "photo2.png", "image/png", "fake image 2".getBytes());

        when(r2StorageService.uploadImage(any(MultipartFile.class), eq("greenphone/reviews")))
                .thenReturn("https://pub-r2.dev/greenphone/reviews/photo1.webp")
                .thenReturn("https://pub-r2.dev/greenphone/reviews/photo2.webp");

        ResponseEntity<ApiResponse<List<String>>> response = reviewController.uploadImages(
                List.of(file1, file2), null, null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).hasSize(2);
        assertThat(response.getBody().getData().get(0)).contains("r2.dev");
        assertThat(response.getBody().getData().get(1)).contains("r2.dev");
        verify(r2StorageService, times(2)).uploadImage(any(), eq("greenphone/reviews"));
    }

    @Test
    @DisplayName("CAT-25: Upload vượt quá 5 ảnh báo lỗi BadRequestException")
    void uploadImages_Exceed5Files_ThrowsBadRequest() {
        List<MultipartFile> sixFiles = List.of(
                new MockMultipartFile("images", "1.jpg", "image/jpeg", new byte[10]),
                new MockMultipartFile("images", "2.jpg", "image/jpeg", new byte[10]),
                new MockMultipartFile("images", "3.jpg", "image/jpeg", new byte[10]),
                new MockMultipartFile("images", "4.jpg", "image/jpeg", new byte[10]),
                new MockMultipartFile("images", "5.jpg", "image/jpeg", new byte[10]),
                new MockMultipartFile("images", "6.jpg", "image/jpeg", new byte[10])
        );

        assertThatThrownBy(() -> reviewController.uploadImages(sixFiles, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("tối đa 5 hình ảnh");

        verifyNoInteractions(r2StorageService);
    }

    @Test
    @DisplayName("CAT-25: Upload ảnh vượt quá 5MB báo lỗi BadRequestException")
    void uploadImages_FileSizeExceeds5MB_ThrowsBadRequest() {
        byte[] oversizedBytes = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile bigFile = new MockMultipartFile(
                "images", "large.png", "image/png", oversizedBytes);

        assertThatThrownBy(() -> reviewController.uploadImages(List.of(bigFile), null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("vượt quá 5MB");

        verifyNoInteractions(r2StorageService);
    }

    @Test
    @DisplayName("CAT-25: Upload tệp định dạng nguy hiểm không phải ảnh báo lỗi BadRequestException")
    void uploadImages_DangerousFileFormat_ThrowsBadRequest() {
        MockMultipartFile shellScript = new MockMultipartFile(
                "images", "exploit.sh", "application/x-sh", "echo dangerous".getBytes());

        assertThatThrownBy(() -> reviewController.uploadImages(List.of(shellScript), null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");

        verifyNoInteractions(r2StorageService);
    }
}
