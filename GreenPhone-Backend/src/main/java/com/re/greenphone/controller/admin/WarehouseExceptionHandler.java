package com.re.greenphone.controller.admin;

import com.re.greenphone.common.dto.ApiResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Keep request parsing errors scoped to this API without changing older endpoints. */
@Order(0)
@RestControllerAdvice(assignableTypes = {AdminWarehouseController.class, WarehouseInventoryController.class})
public class WarehouseExceptionHandler {
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> invalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(ApiResponse.error(400, "Invalid warehouse request"));
    }
}
