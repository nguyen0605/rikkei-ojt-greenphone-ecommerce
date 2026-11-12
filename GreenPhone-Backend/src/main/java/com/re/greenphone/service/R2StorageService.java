package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.config.R2Config;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
public class R2StorageService {

    private final S3Client s3Client;
    private final R2Config r2Config;

    public R2StorageService(
            @org.springframework.beans.factory.annotation.Autowired(required = false) S3Client s3Client,
            R2Config r2Config) {
        this.s3Client = s3Client;
        this.r2Config = r2Config;
    }

    /**
     * Upload an image to Cloudflare R2
     * @param file The multipart image file
     * @param folder The destination folder prefix (e.g. "greenphone/phones")
     * @return Full public URL of the uploaded image
     */
    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File ảnh không được để trống");
        }
        validateImage(file);

        if (s3Client == null) {
            log.warn("S3Client / Cloudflare R2 chưa được cấu hình đầy đủ trong môi trường local, chuyển đổi file sang Base64 Data URL để hiển thị chính xác ảnh vừa chọn.");
            try {
                String mimeType = file.getContentType() != null ? file.getContentType() : "image/png";
                String base64 = java.util.Base64.getEncoder().encodeToString(file.getBytes());
                return "data:" + mimeType + ";base64," + base64;
            } catch (IOException e) {
                log.error("Failed to convert image to Base64", e);
                return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop";
            }
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            } else {
                extension = ".webp";
            }

            String objectKey = folder + "/" + UUID.randomUUID() + extension;

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(r2Config.getBucketName())
                    .key(objectKey)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String fullUrl = r2Config.getPublicUrl() + "/" + objectKey;
            log.info("Uploaded image to Cloudflare R2: {}", fullUrl);
            return fullUrl;

        } catch (IOException e) {
            log.error("Failed to upload image to Cloudflare R2", e);
            throw new RuntimeException("Upload ảnh lên R2 thất bại: " + e.getMessage());
        }
    }

    /**
     * Delete an image from Cloudflare R2 by its public URL
     */
    public void deleteImage(String imageUrl) {
        if (imageUrl == null || r2Config.getPublicUrl() == null || !imageUrl.startsWith(r2Config.getPublicUrl())) {
            return;
        }

        if (s3Client == null) return;

        try {
            String objectKey = imageUrl.replace(r2Config.getPublicUrl() + "/", "");

            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(r2Config.getBucketName())
                    .key(objectKey)
                    .build();

            s3Client.deleteObject(deleteRequest);
            log.info("Deleted image from Cloudflare R2: {}", objectKey);
        } catch (Exception e) {
            log.warn("Failed to delete image from Cloudflare R2: {}", imageUrl, e);
        }
    }

    private void validateImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File phải là định dạng hình ảnh");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BadRequestException("Kích thước ảnh không được vượt quá 10MB");
        }
    }
}
