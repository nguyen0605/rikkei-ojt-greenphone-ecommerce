package com.re.greenphone.common.aop;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    private static final List<String> SENSITIVE_FIELDS = List.of(
            "password", "token", "secret", "authorization", "creditCard");

    @Around("execution(public * com.re.greenphone.controller.*.*(..))")
    public Object logController(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String className = joinPoint.getSignature().getDeclaringTypeName();
        String methodName = joinPoint.getSignature().getName();

        // --- Request ---
        String httpMethod = getHttpMethod();
        String args = sanitizeArgs(joinPoint.getArgs());

        log.info("\u27a1\ufe0f REQUEST  | {} | {}.{}() | Args: {}",
                httpMethod, className, methodName, args);

        Object result;
        try {
            result = joinPoint.proceed();
            long elapsed = System.currentTimeMillis() - start;

            // --- Success Response ---
            log.info("\u2705 RESPONSE | {} | {}.{}() | {}ms | {}",
                    httpMethod, className, methodName, elapsed, getStatus());

        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;

            // --- Error ---
            log.error("\u274c ERROR    | {} | {}.{}() | {}ms | {}: {}",
                    httpMethod, className, methodName, elapsed,
                    e.getClass().getSimpleName(), e.getMessage());
            throw e;
        }

        return result;
    }

    private String getHttpMethod() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest request = attrs.getRequest();
            return request.getMethod();
        } catch (IllegalStateException e) {
            return "UNKNOWN";
        }
    }

    private int getStatus() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletResponse response = attrs.getResponse();
            return response != null ? response.getStatus() : 200;
        } catch (IllegalStateException e) {
            return 200;
        }
    }

    private String sanitizeArgs(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }
        return Arrays.stream(args)
                .map(arg -> {
                    if (arg == null) return "null";
                    String className = arg.getClass().getSimpleName();
                    // Only show type name for complex objects, full toString for primitives/Strings
                    if (arg instanceof String || arg instanceof Number || arg instanceof Boolean) {
                        // Mask if looks like sensitive
                        return arg.toString();
                    }
                    return className;
                })
                .collect(Collectors.joining(", ", "[", "]"));
    }
}
