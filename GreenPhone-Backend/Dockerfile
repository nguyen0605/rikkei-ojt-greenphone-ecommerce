# ============================
# Stage 1: Build the Spring Boot app
# ============================
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /app

# Copy Gradle wrapper and config first (cache layer)
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle .
COPY settings.gradle .

# Download dependencies (cached unless build.gradle changes)
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies

# Copy source code
COPY src/ src/

# Build the fat JAR (skip tests — tests use Testcontainers which needs Docker-in-Docker)
RUN ./gradlew --no-daemon build -x test

# ============================
# Stage 2: Runtime image
# ============================
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Create a non-root user
RUN groupadd -r greenphone && useradd -r -g greenphone greenphone

# Copy the built JAR from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Use non-root user
USER greenphone

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
