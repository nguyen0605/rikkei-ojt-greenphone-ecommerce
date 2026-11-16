-- V25: Create user_device_sessions table for tracking and managing user login devices
CREATE TABLE IF NOT EXISTS user_device_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    device_name VARCHAR(150),
    os VARCHAR(50),
    browser VARCHAR(50),
    ip_address VARCHAR(45),
    is_revoked BOOLEAN DEFAULT FALSE,
    last_active_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    CONSTRAINT fk_user_device_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device_sessions_user_id (user_id),
    UNIQUE KEY uq_user_device_sessions_token_hash (refresh_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
