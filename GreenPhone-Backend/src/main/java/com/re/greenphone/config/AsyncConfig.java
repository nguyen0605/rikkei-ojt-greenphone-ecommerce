package com.re.greenphone.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Global Async Configuration for GreenPhone backend.
 * Provides a tuned ThreadPoolTaskExecutor with CallerRunsPolicy and graceful shutdown.
 */
@Slf4j
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    public static final String TASK_EXECUTOR_BEAN = "applicationTaskExecutor";

    @Primary
    @Bean(name = {TASK_EXECUTOR_BEAN, "taskExecutor"})
    public Executor applicationTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("greenphone-async-");

        // When queue is full, execute the task on caller thread instead of throwing RejectedExecutionException
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        // Graceful shutdown: wait for running tasks to finish
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();
        log.info("Initialized applicationTaskExecutor [corePoolSize=4, maxPoolSize=10, queueCapacity=200]");
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return applicationTaskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (Throwable ex, Method method, Object... params) -> {
            log.error("Unhandled exception occurred in async method '{}' with parameters: {}",
                    method.getName(), params, ex);
        };
    }
}

