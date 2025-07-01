-- =============================================
-- CANCELLATION TOKENS TABLE
-- For secure order cancellation via email links
-- =============================================

CREATE TABLE IF NOT EXISTS cancellation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE NULL,
    is_used BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_tokens_order_id ON cancellation_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_tokens_token ON cancellation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_cancellation_tokens_expires ON cancellation_tokens(expires_at);

-- Create unique constraint on active tokens per order (without NOW() function)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_tokens_order_active 
ON cancellation_tokens(order_id) 
WHERE is_used = FALSE;

-- Function to clean up expired tokens (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_cancellation_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cancellation_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE cancellation_tokens IS 'Secure tokens for email-based order cancellation';
COMMENT ON COLUMN cancellation_tokens.token IS 'Random token for secure cancellation access';
COMMENT ON COLUMN cancellation_tokens.expires_at IS 'Token expiration (default 24 hours)';
COMMENT ON COLUMN cancellation_tokens.used_at IS 'Timestamp when token was used for cancellation'; 