-- =============================================
-- COMPREHENSIVE VENDOR SCHEMA FIX
-- Ensures database matches TypeScript interface
-- =============================================

-- Add missing payment fields if they don't exist
DO $$
BEGIN
    -- Add payment_connected column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connected') THEN
        ALTER TABLE vendors ADD COLUMN payment_connected BOOLEAN DEFAULT false;
    END IF;
    
    -- Add payment_provider column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_provider') THEN
        ALTER TABLE vendors ADD COLUMN payment_provider VARCHAR(20) CHECK (payment_provider IN ('square', 'stripe'));
    END IF;
    
    -- Add payment_account_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_account_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_account_id VARCHAR(255);
    END IF;
    
    -- Add payment_connection_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'payment_connection_id') THEN
        ALTER TABLE vendors ADD COLUMN payment_connection_id UUID;
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
    
    -- Add approved column (alias for is_approved for compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'approved') THEN
        ALTER TABLE vendors ADD COLUMN approved BOOLEAN DEFAULT false;
    END IF;
    
    -- Add active column (alias for is_active for compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'active') THEN
        ALTER TABLE vendors ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
    
    -- Ensure is_approved exists (from original schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'is_approved') THEN
        ALTER TABLE vendors ADD COLUMN is_approved BOOLEAN DEFAULT false;
    END IF;
    
    -- Ensure is_active exists (from original schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'is_active') THEN
        ALTER TABLE vendors ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- =============================================
-- SYNC APPROVAL FIELDS
-- Keep is_approved and approved in sync
-- =============================================

-- Create function to sync approval fields
CREATE OR REPLACE FUNCTION sync_vendor_approval_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_approved is updated, sync to approved
    IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
        NEW.approved = NEW.is_approved;
    END IF;
    
    -- If approved is updated, sync to is_approved
    IF OLD.approved IS DISTINCT FROM NEW.approved THEN
        NEW.is_approved = NEW.approved;
    END IF;
    
    -- If is_active is updated, sync to active
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        NEW.active = NEW.is_active;
    END IF;
    
    -- If active is updated, sync to is_active
    IF OLD.active IS DISTINCT FROM NEW.active THEN
        NEW.is_active = NEW.active;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync approval fields
DROP TRIGGER IF EXISTS sync_vendor_approval_trigger ON vendors;
CREATE TRIGGER sync_vendor_approval_trigger
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION sync_vendor_approval_fields();

-- =============================================
-- FIX EXISTING DATA
-- Ensure all existing vendors have consistent data
-- =============================================

-- Sync existing approval data
UPDATE vendors 
SET approved = is_approved, 
    active = is_active
WHERE approved IS DISTINCT FROM is_approved 
   OR active IS DISTINCT FROM is_active;

-- Set default values for new vendors without approval status
UPDATE vendors 
SET is_approved = false, 
    approved = false,
    is_active = true,
    active = true
WHERE is_approved IS NULL 
   OR approved IS NULL 
   OR is_active IS NULL 
   OR active IS NULL;

-- Set default payment connection status
UPDATE vendors 
SET payment_connected = false 
WHERE payment_connected IS NULL;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_vendors_approved ON vendors(approved);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(active);
CREATE INDEX IF NOT EXISTS idx_vendors_payment_connected ON vendors(payment_connected);
CREATE INDEX IF NOT EXISTS idx_vendors_payment_provider ON vendors(payment_provider);

-- =============================================
-- VERIFY SCHEMA CONSISTENCY
-- =============================================

-- Display current vendor schema info
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'vendors' 
    AND column_name IN ('approved', 'active', 'payment_connected', 'payment_provider', 'payment_account_id');
    
    RAISE NOTICE 'Vendor schema fix completed. Found % required columns.', col_count;
    
    -- Check if we have any vendors
    SELECT COUNT(*) INTO col_count FROM vendors;
    RAISE NOTICE 'Total vendors in database: %', col_count;
END $$; 