package com.re.greenphone.common.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends AppException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }

    public BadRequestException(String message, String errorCode) {
        super(HttpStatus.BAD_REQUEST, message, errorCode);
    }
}
