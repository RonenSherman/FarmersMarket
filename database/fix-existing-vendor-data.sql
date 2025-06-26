-- Fix existing vendor data that violates the new constraints
-- This handles existing rows that don't match the updated constraints

-- First, let's see what product_type values exist that are causing issues
-- (You can run this separately to see what needs to be fixed)
-- SELECT DISTINCT product_type FROM vendors WHERE product_type NOT IN (
--     'produce', 'meat', 'dairy', 'baked_goods', 'crafts', 
--     'artisan_goods', 'flowers', 'honey', 'preserves'
-- );

-- Update any invalid product_type values to a default
-- This assumes 'produce' is a safe default, but you may want to review the data first
UPDATE vendors 
SET product_type = 'produce' 
WHERE product_type IS NULL 
   OR product_type NOT IN (
       'produce', 'meat', 'dairy', 'baked_goods', 'crafts', 
       'artisan_goods', 'flowers', 'honey', 'preserves'
   );

-- Update any invalid payment_method values
UPDATE vendors 
SET payment_method = NULL 
WHERE payment_method IS NOT NULL 
   AND payment_method NOT IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth');

-- Now drop and recreate the constraints
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_product_type_check;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payment_method_check;

-- Add the updated constraints
ALTER TABLE vendors ADD CONSTRAINT vendors_product_type_check 
CHECK (product_type IN (
    'produce', 'meat', 'dairy', 'baked_goods', 'crafts', 
    'artisan_goods', 'flowers', 'honey', 'preserves'
));

ALTER TABLE vendors ADD CONSTRAINT vendors_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'both', 'square', 'stripe', 'oauth'));

-- Make payment_method nullable
ALTER TABLE vendors ALTER COLUMN payment_method DROP NOT NULL;

-- Add missing payment columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_provider') THEN
        ALTER TABLE vendors ADD COLUMN payment_provider VARCHAR(20) CHECK (payment_provider IN ('square', 'stripe'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected BOOLEAN DEFAULT false;
    END IF;
    
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