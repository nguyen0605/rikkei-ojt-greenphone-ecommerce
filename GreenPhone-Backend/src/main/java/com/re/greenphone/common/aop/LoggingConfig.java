package com.re.greenphone.common.aop;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@EnableAspectJAutoProxy
public class LoggingConfig {
    // Enables AOP proxy support
    // Future: can add custom logging filters, MDC context, etc.
}
