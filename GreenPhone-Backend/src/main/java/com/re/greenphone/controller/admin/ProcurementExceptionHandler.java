package com.re.greenphone.controller.admin;
import com.re.greenphone.common.dto.ApiResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
@Order(0) @RestControllerAdvice(assignableTypes={AdminSupplierController.class,AdminPurchaseOrderController.class})
public class ProcurementExceptionHandler {
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> invalid(Exception ex) { return ResponseEntity.badRequest().body(ApiResponse.error(400,"Invalid procurement request")); }
}
