-- Migration script to remove approval fields from vendors table
-- This script removes the is_approved and approved columns and updates related database objects

BEGIN;

-- First, drop the policies that reference approval fields
DROP POLICY IF EXISTS "Public can view approved vendors" ON vendors;

-- Create new policy for active vendors only
CREATE POLICY "Public can view active vendors" ON vendors FOR SELECT USING (is_active = true);

-- Drop indexes that reference approval fields
DROP INDEX IF EXISTS idx_vendors_approved;
DROP INDEX IF EXISTS idx_active_vendors;

-- Recreate active vendors index without approval requirement
CREATE INDEX idx_active_vendors ON vendors(name) WHERE is_active = true;

-- Drop the vendor_analytics view and recreate it without approval requirement
DROP VIEW IF EXISTS vendor_analytics;
CREATE VIEW vendor_analytics AS
SELECT 
    v.id,
    v.name,
    v.product_type,
    v.contact_email,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COALESCE(AVG(o.total), 0) as avg_order_value,
    COUNT(DISTINCT o.order_date) as market_days_participated,
    COALESCE(AVG(cf.rating), 0) as avg_rating,
    COUNT(cf.id) as total_reviews
FROM vendors v
LEFT JOIN orders o ON v.id = o.vendor_id AND o.order_status = 'completed'
LEFT JOIN customer_feedback cf ON v.id = cf.vendor_id AND cf.is_public = true
WHERE v.is_active = true
GROUP BY v.id, v.name, v.product_type, v.contact_email;

-- Remove approval columns from vendors table
ALTER TABLE vendors DROP COLUMN IF EXISTS is_approved;
ALTER TABLE vendors DROP COLUMN IF EXISTS approved;

COMMIT;

-- Note: Run this script on your production database to apply the changes
-- Make sure to backup your database before running this migration 