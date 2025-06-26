-- Comprehensive fix for all vendor table constraints
-- This ensures the database constraints match the new OAuth payment system

-- Fix payment_method constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payment_method_check;
ALTER TABLE vendors ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE vendors ADD CONSTRAINT vendors_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth'));

-- Fix product_type constraint  
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_product_type_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_product_type_check 
CHECK (product_type IN (
    'produce',
    'meat', 
    'dairy',
    'baked_goods',
    'crafts',
    'artisan_goods',
    'flowers',
    'honey',
    'preserves'
));

-- Ensure all new payment columns exist
DO $$
BEGIN
    -- Add payment_provider column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_provider') THEN
        ALTER TABLE vendors ADD COLUMN payment_provider VARCHAR(20) CHECK (payment_provider IN ('square', 'stripe'));
    END IF;
    
    -- Add payment_connected column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected BOOLEAN DEFAULT false;
    END IF;
    
    -- Add other payment columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connection_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_connection_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_account_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_account_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_refresh_token_hash') THEN
        ALTER TABLE vendors ADD COLUMN payment_refresh_token_hash VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected_at') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_last_verified') THEN
        ALTER TABLE vendors ADD COLUMN payment_last_verified TIMESTAMP WITH TIME ZONE;
    END IF;
END $$; 