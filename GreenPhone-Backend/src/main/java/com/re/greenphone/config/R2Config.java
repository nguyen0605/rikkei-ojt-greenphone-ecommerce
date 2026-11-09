package com.re.greenphone.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "cloudflare.r2")
public class R2Config {

    private String accountId;
    private String accessKey;
    private String secretKey;
    private String bucketName = "greenphone-media";
    private String publicUrl;

    @Bean
    public S3Client s3Client() {
        if (accountId == null || accountId.isBlank()
                || accessKey == null || accessKey.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            return null;
        }
        try {
            String endpoint = String.format("https://%s.r2.cloudflarestorage.com", accountId.trim());
            return S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey.trim(), secretKey.trim())
                    ))
                    .region(Region.of("auto"))
                    .build();
        } catch (Exception e) {
            return null;
        }
    }
}
