package com.re.greenphone.security;

import com.re.greenphone.common.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new UnauthorizedException("Bạn chưa đăng nhập.");
        }
        return (UserPrincipal) authentication.getPrincipal();
    }

    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public static String getCurrentUserRole() {
        return getCurrentUser().getAuthorities().stream()
                .findFirst()
                .map(Object::toString)
                .orElse("ROLE_CUSTOMER");
    }

    public static boolean hasRole(String role) {
        try {
            return getCurrentUser().getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equalsIgnoreCase(role));
        } catch (Exception e) {
            return false;
        }
    }
}
