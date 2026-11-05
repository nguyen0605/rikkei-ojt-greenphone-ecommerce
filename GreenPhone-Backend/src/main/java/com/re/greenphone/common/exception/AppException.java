package com.re.greenphone.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public abstract class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected AppException(HttpStatus status, String message) {
        this(status, message, null, null);
    }

    protected AppException(HttpStatus status, String message, String errorCode) {
        this(status, message, errorCode, null);
    }

    protected AppException(HttpStatus status, String message, Throwable cause) {
        this(status, message, null, cause);
    }

    protected AppException(HttpStatus status, String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }
}
