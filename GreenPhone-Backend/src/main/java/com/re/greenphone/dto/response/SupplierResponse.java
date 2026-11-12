package com.re.greenphone.dto.response;
import java.time.LocalDateTime;
public record SupplierResponse(Long id,String code,String name,String taxCode,String email,String phone,String address,String status,LocalDateTime createdAt,LocalDateTime updatedAt) {}
