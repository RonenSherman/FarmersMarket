-- =============================================
-- PAYMENT OAUTH INTEGRATION SCHEMA
-- Secure storage for vendor payment connections
-- =============================================

-- Add payment connection fields to vendors table
ALTER TABLE vendors 
ADD COLUMN payment_provider VARCHAR(20) CHECK (payment_provider IN ('square', 'stripe')),
ADD COLUMN payment_connected BOOLEAN DEFAULT false,
ADD COLUMN payment_connection_id VARCHAR(255), -- Encrypted connection ID
ADD COLUMN payment_account_id VARCHAR(255), -- Provider account ID (e.g., Square merchant ID)
ADD COLUMN payment_refresh_token_hash VARCHAR(255), -- Hashed refresh token
ADD COLUMN payment_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_last_verified TIMESTAMP WITH TIME ZONE;

-- Create payment_connections table for secure storage
CREATE TABLE payment_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    provider_account_id VARCHAR(255) NOT NULL, -- Square merchant ID or Stripe account ID
    access_token_hash VARCHAR(255) NOT NULL, -- Encrypted access token
    refresh_token_hash VARCHAR(255), -- Encrypted refresh token (if applicable)
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[], -- OAuth scopes granted
    webhook_endpoint_id VARCHAR(255), -- Provider webhook endpoint ID
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (
        connection_status IN ('active', 'expired', 'revoked', 'error')
    ),
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Additional provider-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_connections
CREATE INDEX idx_payment_connections_vendor ON payment_connections(vendor_id);
CREATE INDEX idx_payment_connections_provider ON payment_connections(provider);
CREATE INDEX idx_payment_connections_status ON payment_connections(connection_status);
CREATE UNIQUE INDEX idx_payment_connections_vendor_provider ON payment_connections(vendor_id, provider);

-- Create payment_transactions table for tracking order payments
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    provider_transaction_id VARCHAR(255) NOT NULL, -- Square payment ID or Stripe payment intent ID
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')
    ),
    payment_method_type VARCHAR(50), -- card, apple_pay, google_pay, etc.
    failure_reason TEXT,
    provider_fee DECIMAL(10,2), -- Provider processing fee
    net_amount DECIMAL(10,2), -- Amount after fees
    processed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_transactions
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_vendor ON payment_transactions(vendor_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider_id ON payment_transactions(provider_transaction_id);

-- Create webhook_events table for tracking provider webhooks
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL, -- Provider event ID
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook_events
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_vendor ON webhook_events(vendor_id);
CREATE UNIQUE INDEX idx_webhook_events_provider_event ON webhook_events(provider, event_id);

-- Add triggers for updated_at
CREATE TRIGGER update_payment_connections_updated_at 
    BEFORE UPDATE ON payment_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security functions for token encryption/decryption
-- Note: These would use actual encryption in production
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, use proper encryption (pg_crypto extension)
    -- For now, return a placeholder hash
    RETURN encode(digest(token || current_setting('app.encryption_key', true), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
    -- In production, implement proper decryption
    -- This is a placeholder that returns NULL for security
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check payment connection status
CREATE OR REPLACE FUNCTION check_payment_connection_status(vendor_uuid UUID)
RETURNS TABLE(
    connected BOOLEAN,
    provider TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.connection_status = 'active' as connected,
        pc.provider::TEXT,
        pc.connection_status::TEXT as status,
        pc.token_expires_at
    FROM payment_connections pc
    WHERE pc.vendor_id = vendor_uuid
    AND pc.connection_status = 'active'
    ORDER BY pc.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON payment_connections TO authenticated;
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON webhook_events TO authenticated; 