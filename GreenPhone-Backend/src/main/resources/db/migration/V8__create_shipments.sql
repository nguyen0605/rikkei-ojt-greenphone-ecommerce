-- Migration V8: Create shipment and shipment_history tables
-- Module: ORD (Order & Fulfillment)

CREATE TABLE IF NOT EXISTS shipment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    tracking_number VARCHAR(100) NOT NULL UNIQUE,
    carrier_code VARCHAR(50) NOT NULL,
    shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cod_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'READY_TO_SHIP',
    estimated_delivery_at DATETIME NULL,
    delivered_at DATETIME NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_shipment_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT
);

CREATE INDEX idx_shipment_order_id ON shipment (order_id);
CREATE INDEX idx_shipment_status ON shipment (status);

CREATE TABLE IF NOT EXISTS shipment_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shipment_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    hub_location VARCHAR(255) NULL,
    shipper_note VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_shipment_history_shipment FOREIGN KEY (shipment_id) REFERENCES shipment (id) ON DELETE CASCADE
);

CREATE INDEX idx_shipment_history_shipment_id ON shipment_history (shipment_id);
