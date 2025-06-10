-- Fix Supabase RLS Policies for Public Access
-- Run these commands in your Supabase SQL editor

-- 1. Enable RLS but allow public read access to products and vendors
-- These tables need to be readable by anonymous users for the shop to work

-- Products table - allow public read access
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
CREATE POLICY "Allow public read access to products" ON products
  FOR SELECT USING (true);

-- Vendors table - allow public read access  
DROP POLICY IF EXISTS "Allow public read access to vendors" ON vendors;
CREATE POLICY "Allow public read access to vendors" ON vendors
  FOR SELECT USING (true);

-- Market dates table - allow public read access
DROP POLICY IF EXISTS "Allow public read access to market_dates" ON market_dates;
CREATE POLICY "Allow public read access to market_dates" ON market_dates
  FOR SELECT USING (true);

-- Orders table - allow insert for new orders, but restrict read access
DROP POLICY IF EXISTS "Allow public insert to orders" ON orders;
CREATE POLICY "Allow public insert to orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Alternative: If you want to completely disable RLS for testing
-- (ONLY for development - not recommended for production)
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE market_dates DISABLE ROW LEVEL SECURITY;

-- Check current RLS settings
SELECT schemaname, tablename, rowsecurity, hasrowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'vendors', 'orders', 'market_dates'); 