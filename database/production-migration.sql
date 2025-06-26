-- =============================================
-- PRODUCTION MIGRATION SCRIPT
-- Complete setup for OAuth payment integration
-- =============================================

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function for updating timestamps if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up any existing constraints that might conflict
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payment_method_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_product_type_check;

-- Update existing data to be compatible
UPDATE vendors 
SET product_type = 'produce' 
WHERE product_type IS NULL 
   OR product_type NOT IN (
       'produce', 'meat', 'dairy', 'baked_goods', 'crafts', 
       'artisan_goods', 'flowers', 'honey', 'preserves'
   );

UPDATE vendors 
SET payment_method = NULL 
WHERE payment_method IS NOT NULL 
   AND payment_method NOT IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth');

-- Make payment_method nullable
ALTER TABLE vendors ALTER COLUMN payment_method DROP NOT NULL;

-- Add new payment columns to vendors table
DO $$
BEGIN
    -- Add payment_provider column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_provider') THEN
        ALTER TABLE vendors ADD COLUMN payment_provider VARCHAR(20);
    END IF;
    
    -- Add payment_connected column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected BOOLEAN DEFAULT false;
    END IF;
    
    -- Add payment_connection_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connection_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_connection_id UUID;
    END IF;
    
    -- Add payment_account_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_account_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_account_id VARCHAR(255);
    END IF;
    
    -- Add payment_connected_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected_at') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add payment_last_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_last_verified') THEN
        ALTER TABLE vendors ADD COLUMN payment_last_verified TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create payment_connections table
CREATE TABLE IF NOT EXISTS payment_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    provider_account_id VARCHAR(255) NOT NULL,
    access_token_hash TEXT NOT NULL, -- Encrypted access token
    refresh_token_hash TEXT, -- Encrypted refresh token (if applicable)
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

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('square', 'stripe')),
    provider_transaction_id VARCHAR(255) NOT NULL,
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

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_connections_vendor ON payment_connections(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_connections_provider ON payment_connections(provider);
CREATE INDEX IF NOT EXISTS idx_payment_connections_status ON payment_connections(connection_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_connections_vendor_provider ON payment_connections(vendor_id, provider);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor ON payment_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_id ON payment_transactions(provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_vendor ON webhook_events(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON webhook_events(provider, event_id);

-- Add constraints to vendors table
ALTER TABLE vendors ADD CONSTRAINT vendors_product_type_check 
CHECK (product_type IN (
    'produce', 'meat', 'dairy', 'baked_goods', 'crafts', 
    'artisan_goods', 'flowers', 'honey', 'preserves'
));

ALTER TABLE vendors ADD CONSTRAINT vendors_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth'));

ALTER TABLE vendors ADD CONSTRAINT vendors_payment_provider_check 
CHECK (payment_provider IS NULL OR payment_provider IN ('square', 'stripe'));

-- Add foreign key constraint for payment_connection_id
ALTER TABLE vendors ADD CONSTRAINT fk_vendors_payment_connection
FOREIGN KEY (payment_connection_id) REFERENCES payment_connections(id) ON DELETE SET NULL;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_payment_connections_updated_at ON payment_connections;
CREATE TRIGGER update_payment_connections_updated_at 
    BEFORE UPDATE ON payment_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create utility functions
CREATE OR REPLACE FUNCTION get_vendor_payment_status(vendor_uuid UUID)
RETURNS TABLE(
    connected BOOLEAN,
    provider TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    account_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.connection_status = 'active' as connected,
        pc.provider::TEXT,
        pc.connection_status::TEXT as status,
        pc.token_expires_at,
        pc.provider_account_id::TEXT
    FROM payment_connections pc
    WHERE pc.vendor_id = vendor_uuid
    AND pc.connection_status = 'active'
    ORDER BY pc.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Set up Row Level Security (RLS)
ALTER TABLE payment_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment connections" ON payment_connections
    FOR SELECT USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Users can insert their own payment connections" ON payment_connections
    FOR INSERT WITH CHECK (auth.uid()::text = vendor_id::text);

CREATE POLICY "Users can update their own payment connections" ON payment_connections
    FOR UPDATE USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Users can view their own payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid()::text = vendor_id::text);

CREATE POLICY "Service role can manage all payment data" ON payment_connections
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all transaction data" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all webhook data" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON payment_connections TO authenticated;
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON webhook_events TO authenticated;
GRANT ALL ON payment_connections TO service_role;
GRANT ALL ON payment_transactions TO service_role;
GRANT ALL ON webhook_events TO service_role; 