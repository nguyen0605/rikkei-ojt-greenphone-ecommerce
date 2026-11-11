package com.re.greenphone.security;

import com.re.greenphone.config.JwtConfig;
import com.re.greenphone.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final JwtConfig jwtConfig;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtConfig.getExpiration());

        String role = userPrincipal.getAuthorities() != null && !userPrincipal.getAuthorities().isEmpty()
                ? userPrincipal.getAuthorities().iterator().next().getAuthority()
                : "ROLE_CUSTOMER";

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .claim("userId", userPrincipal.getId())
                .claim("fullName", userPrincipal.getFullName())
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return extractUserId(claims);
        } catch (ExpiredJwtException e) {
            log.debug("Token is expired, extracting userId from expired claims: {}", e.getMessage());
            return extractUserId(e.getClaims());
        } catch (Exception e) {
            log.error("Failed to extract userId from token: {}", e.getMessage());
            return null;
        }
    }

    private Long extractUserId(Claims claims) {
        if (claims == null) {
            return null;
        }
        Object userId = claims.get("userId");
        if (userId instanceof Number) {
            return ((Number) userId).longValue();
        }
        return null;
    }

    public long getRemainingExpiration(String token) {
        try {
            Claims claims = parseClaims(token);
            Date expiration = claims.getExpiration();
            if (expiration == null) {
                return 0;
            }
            long diff = expiration.getTime() - System.currentTimeMillis();
            return Math.max(0, diff);
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Failed to get expiration from token: {}", e.getMessage());
            return 0;
        }
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
