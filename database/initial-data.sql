-- =============================================
-- INITIAL DATA FOR DUVALL FARMERS MARKET
-- Run this AFTER creating the main schema
-- =============================================

-- Insert upcoming Thursday market dates (next 12 Thursdays)
INSERT INTO market_dates (date, is_active, start_time, end_time) 
SELECT 
    (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER + (n * 7))::DATE as market_date,
    true,
    '15:00:00'::TIME,
    '18:30:00'::TIME
FROM generate_series(0, 11) n  -- Next 12 Thursdays
WHERE (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER + (n * 7))::DATE >= CURRENT_DATE;

-- Insert sample admin user (replace with your actual email)
INSERT INTO admin_users (email, name, role) VALUES 
('admin@duvallfarmersmakrket.com', 'Market Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert some sample vendor data for testing (optional)
INSERT INTO vendors (
    name, 
    contact_email, 
    contact_phone, 
    product_type, 
    api_consent, 
    payment_method, 
    available_dates,
    is_approved,
    description
) VALUES 
(
    'Fresh Valley Farm',
    'demo@freshvalley.com',
    '(425) 555-0123',
    'produce',
    true,
    'both',
    ARRAY[]::TEXT[],
    true,
    'Family-owned organic farm specializing in seasonal vegetables and herbs'
),
(
    'Sunrise Bakery',
    'demo@sunrisebakery.com',
    '(425) 555-0124',
    'baked_goods',
    true,
    'card',
    ARRAY[]::TEXT[],
    true,
    'Artisan breads and pastries made fresh daily with locally sourced ingredients'
),
(
    'Mountain Honey Co',
    'demo@mountainhoney.com',
    '(425) 555-0125',
    'preserves_sauces',
    true,
    'both',
    ARRAY[]::TEXT[],
    true,
    'Raw honey and handcrafted preserves from the Cascade Mountains'
)
ON CONFLICT (contact_email) DO NOTHING;

-- Insert sample products for demo vendors
DO $$
DECLARE
    fresh_valley_id UUID;
    sunrise_bakery_id UUID;
    mountain_honey_id UUID;
BEGIN
    -- Get vendor IDs
    SELECT id INTO fresh_valley_id FROM vendors WHERE contact_email = 'demo@freshvalley.com';
    SELECT id INTO sunrise_bakery_id FROM vendors WHERE contact_email = 'demo@sunrisebakery.com';
    SELECT id INTO mountain_honey_id FROM vendors WHERE contact_email = 'demo@mountainhoney.com';
    
    -- Insert sample products if vendors exist
    IF fresh_valley_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity) VALUES
        (fresh_valley_id, 'Organic Carrots', 'Fresh organic carrots, great for snacking or cooking', 3.50, 'bunch', 'produce', true, 20),
        (fresh_valley_id, 'Mixed Greens', 'Fresh salad mix with arugula, spinach, and lettuce', 4.00, 'bag', 'produce', true, 15),
        (fresh_valley_id, 'Cherry Tomatoes', 'Sweet cherry tomatoes, perfect for salads', 5.50, 'pint', 'produce', true, 12);
    END IF;
    
    IF sunrise_bakery_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity) VALUES
        (sunrise_bakery_id, 'Sourdough Bread', 'Classic sourdough made with wild yeast starter', 6.00, 'loaf', 'baked_goods', true, 8),
        (sunrise_bakery_id, 'Blueberry Muffins', 'Fresh blueberry muffins made with local berries', 12.00, 'dozen', 'baked_goods', true, 5),
        (sunrise_bakery_id, 'Cinnamon Rolls', 'Sweet cinnamon rolls with cream cheese glaze', 15.00, 'half-dozen', 'baked_goods', true, 4);
    END IF;
    
    IF mountain_honey_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity) VALUES
        (mountain_honey_id, 'Wildflower Honey', 'Raw wildflower honey from mountain meadows', 12.00, 'jar', 'preserves_sauces', true, 10),
        (mountain_honey_id, 'Strawberry Jam', 'Homemade strawberry jam with local berries', 8.50, 'jar', 'preserves_sauces', true, 8),
        (mountain_honey_id, 'Apple Butter', 'Slow-cooked apple butter with cinnamon and spices', 9.00, 'jar', 'preserves_sauces', true, 6);
    END IF;
END $$;

-- Display success message
SELECT 'Initial data inserted successfully! Check the vendors and products tables.' as message; 