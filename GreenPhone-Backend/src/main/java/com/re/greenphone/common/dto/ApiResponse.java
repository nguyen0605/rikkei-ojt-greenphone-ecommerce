package com.re.greenphone.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final int code;
    private final String message;
    private final String errorCode;
    @Setter
    private T data;
    private final long timestamp;

    private ApiResponse(int code, String message, T data) {
        this(code, message, null, data);
    }

    private ApiResponse(int code, String message, String errorCode, T data) {
        this.code = code;
        this.message = message;
        this.errorCode = errorCode;
        this.data = data;
        this.timestamp = Instant.now().toEpochMilli();
    }

    // --- Static factory methods ---

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "Success", null, data);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(200, message, null, data);
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(201, "Created", null, data);
    }

    public static <T> ApiResponse<T> noContent() {
        return new ApiResponse<>(204, "No Content", null, null);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null, null);
    }

    public static <T> ApiResponse<T> error(int code, String message, String errorCode) {
        return new ApiResponse<>(code, message, errorCode, null);
    }
}
