-- =============================================
-- PAYMENT AUTHORIZATION SCHEMA UPDATE
-- Add support for payment authorization data to orders
-- =============================================

-- Add payment authorization data column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_authorization_data JSONB DEFAULT NULL;

-- Add notification_method column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notification_method VARCHAR(20) DEFAULT 'email' CHECK (notification_method IN ('email', 'sms', 'both'));

-- Update payment_status check constraint to include new statuses
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled'));

-- Add indexes for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_authorization ON orders USING GIN (payment_authorization_data);

-- Handle existing dependencies before dropping payment_transactions table
-- Drop foreign key constraints from webhook_events if they exist
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_transaction_id_fkey;

-- Drop payment_transactions table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS payment_transactions CASCADE;

-- Create payment_transactions table to track all payment operations
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    provider_transaction_id VARCHAR(255) NOT NULL, -- Square payment ID or Stripe payment intent ID
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('authorization', 'capture', 'void', 'refund')
    ),
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'voided')
    ),
    payment_method_type VARCHAR(50), -- 'card', 'ach', etc.
    failure_reason TEXT,
    provider_fee INTEGER, -- Provider fee in cents
    net_amount INTEGER, -- Net amount after fees in cents
    processed_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount INTEGER, -- Refund amount in cents
    metadata JSONB DEFAULT '{}', -- Additional provider-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_transactions
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_vendor ON payment_transactions(vendor_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider, provider_transaction_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(transaction_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trigger_update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Recreate webhook_events table if it was dropped by CASCADE
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_transaction ON webhook_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Add comments for documentation
COMMENT ON TABLE payment_transactions IS 'Track all payment operations including authorizations, captures, voids, and refunds';
COMMENT ON TABLE webhook_events IS 'Store webhook events from payment providers for processing';
COMMENT ON COLUMN orders.payment_authorization_data IS 'JSON data containing payment authorization details from payment processor';
COMMENT ON COLUMN payment_transactions.provider_transaction_id IS 'The transaction ID from the payment provider (Square, Stripe, etc.)';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type of payment operation: authorization, capture, void, or refund';
COMMENT ON COLUMN payment_transactions.amount IS 'Transaction amount in cents to avoid floating point issues'; 