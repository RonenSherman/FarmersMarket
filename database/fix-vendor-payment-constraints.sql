-- Fix vendors table constraints for new payment system
-- This removes the old payment_method constraint and updates the table structure

-- First, drop the old check constraint that's causing the error
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payment_method_check;

-- Update the payment_method column to allow NULL and new values
ALTER TABLE vendors ALTER COLUMN payment_method DROP NOT NULL;

-- Add a new, more flexible constraint that allows the new payment system
ALTER TABLE vendors ADD CONSTRAINT vendors_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth'));

-- Make sure the new payment columns exist (in case the schema wasn't fully applied)
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