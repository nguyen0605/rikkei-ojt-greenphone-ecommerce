package com.re.greenphone.dto.request;
import jakarta.validation.constraints.*;
public record SupplierRequest(
    @NotBlank @Size(max=50) @Pattern(regexp="^[A-Z0-9]+(?:-[A-Z0-9]+)*$") String code,
    @NotBlank @Size(min=3,max=150) String name,
    @Pattern(regexp="^$|^[0-9]{10}(?:-?[0-9]{3})?$") String taxCode,
    @Email @Size(max=100) String email,
    @Size(max=20) String phone,
    @Size(max=255) String address
) {
    public SupplierRequest {
        code=trim(code); name=trim(name); taxCode=trim(taxCode);
        email=trim(email); phone=trim(phone); address=trim(address);
    }
    private static String trim(String value) { return value==null?null:value.strip(); }
}
