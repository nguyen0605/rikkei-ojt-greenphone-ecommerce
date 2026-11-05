package com.re.greenphone.config;

import org.junit.jupiter.api.Test;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AsyncConfigTest {

    @Test
    void applicationTaskExecutor_ShouldBeConfiguredWithCorrectParameters() {
        AsyncConfig config = new AsyncConfig();
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) config.applicationTaskExecutor();

        try {
            assertThat(executor.getCorePoolSize()).isEqualTo(4);
            assertThat(executor.getMaxPoolSize()).isEqualTo(10);
            assertThat(executor.getQueueCapacity()).isEqualTo(200);
            assertThat(executor.getThreadNamePrefix()).isEqualTo("greenphone-async-");
            assertThat(config.getAsyncExecutor()).isNotNull();
        } finally {
            executor.destroy();
        }
    }

    @Test
    void applicationTaskExecutor_ShouldExecuteTaskOnCustomNamedThread() throws InterruptedException {
        AsyncConfig config = new AsyncConfig();
        ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) config.applicationTaskExecutor();

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> threadNameRef = new AtomicReference<>();

        try {
            executor.execute(() -> {
                threadNameRef.set(Thread.currentThread().getName());
                latch.countDown();
            });

            boolean completed = latch.await(5, TimeUnit.SECONDS);
            assertThat(completed).isTrue();
            assertThat(threadNameRef.get()).startsWith("greenphone-async-");
        } finally {
            executor.destroy();
        }
    }

    @Test
    void asyncUncaughtExceptionHandler_ShouldHandleExceptionWithoutThrowing() throws NoSuchMethodException {
        AsyncConfig config = new AsyncConfig();
        AsyncUncaughtExceptionHandler handler = config.getAsyncUncaughtExceptionHandler();

        assertThat(handler).isNotNull();

        Method sampleMethod = String.class.getMethod("toString");
        // Should handle gracefully and log error without throwing exception
        handler.handleUncaughtException(new RuntimeException("Test async error"), sampleMethod, "param1", 123);
    }
}

