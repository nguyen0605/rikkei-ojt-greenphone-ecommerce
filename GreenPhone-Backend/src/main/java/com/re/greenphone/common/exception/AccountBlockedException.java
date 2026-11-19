package com.re.greenphone.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.Map;

@Getter
public class AccountBlockedException extends AppException {

    private final String reason;
    private final String supportEmail;
    private final String supportHotline;

    public AccountBlockedException(String reason) {
        super(HttpStatus.FORBIDDEN, "Tài khoản của bạn đã bị khóa bởi Quản trị viên.", "ACCOUNT_BLOCKED");
        this.reason = reason != null && !reason.isBlank()
                ? reason.trim()
                : "Vi phạm chính sách và điều khoản sử dụng của GreenPhone.";
        this.supportEmail = "hotro@greenphone.com";
        this.supportHotline = "1900 1234";
    }

    public Map<String, Object> toResponseMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("code", "ACCOUNT_BLOCKED");
        map.put("message", getMessage());
        map.put("reason", this.reason);
        map.put("supportEmail", this.supportEmail);
        map.put("supportHotline", this.supportHotline);
        return map;
    }
}
