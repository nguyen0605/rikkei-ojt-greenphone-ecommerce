-- V14: Create order_histories table for auditing status changes
CREATE TABLE IF NOT EXISTS order_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    note VARCHAR(500) NULL,
    changed_by VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE INDEX idx_order_history_order_id ON order_histories (order_id);

