-- Historical costs intentionally remain NULL: never fabricate past margins.
ALTER TABLE order_detail ADD COLUMN unit_cost DECIMAL(19,6) NULL;
CREATE INDEX idx_orders_payment_created ON orders(payment_status, created_at);
CREATE INDEX idx_refund_status_refunded ON refund(status, refunded_at);
