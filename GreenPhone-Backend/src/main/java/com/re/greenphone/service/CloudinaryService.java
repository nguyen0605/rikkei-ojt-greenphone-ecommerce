package com.re.greenphone.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.config.CloudinaryConfig;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final CloudinaryConfig cloudinaryConfig;
    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudinaryConfig.getCloudName(),
                "api_key", cloudinaryConfig.getApiKey(),
                "api_secret", cloudinaryConfig.getApiSecret()
        ));
    }

    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        validateImage(file);

        try {
            String publicId = folder + "/" + UUID.randomUUID();
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId,
                    "folder", folder,
                    "resource_type", "image"
            ));
            log.info("Uploaded image to Cloudinary: {}", uploadResult.get("secure_url"));
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary", e);
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains("cloudinary.com")) return;
        String publicId = extractPublicId(imageUrl);
        if (publicId == null) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Deleted image from Cloudinary: {}", publicId);
        } catch (IOException e) {
            log.warn("Failed to delete image from Cloudinary: {}", publicId, e);
        }
    }

    private String extractPublicId(String imageUrl) {
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
        try {
            String path = imageUrl.substring(imageUrl.indexOf("/upload/") + 8);
            int slashIdx = path.indexOf('/');
            if (slashIdx > 0) {
                String withFormat = path.substring(slashIdx + 1);
                int dotIdx = withFormat.lastIndexOf('.');
                return dotIdx > 0 ? withFormat.substring(0, dotIdx) : withFormat;
            }
        } catch (Exception e) {
            log.warn("Could not extract publicId from URL: {}", imageUrl);
        }
        return null;
    }

    private void validateImage(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BadRequestException("File size must be less than 10MB");
        }
    }
}
