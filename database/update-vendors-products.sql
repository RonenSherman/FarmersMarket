-- =============================================
-- UPDATE VENDORS AND PRODUCTS DATA
-- Remove all existing data and add new vendors
-- =============================================

-- First, delete all existing data (products first due to foreign key constraint)
DELETE FROM products;
DELETE FROM vendors;

-- Insert the three new vendors
INSERT INTO vendors (
    name, 
    contact_email, 
    contact_phone, 
    product_type, 
    api_consent, 
    payment_method, 
    available_dates,
    
    is_active,
    description
) VALUES 
(
    'Ayala Family Farm',
    'contact@ayalafamilyfarm.com',
    '(425) 555-0201',
    'produce',
    true,
    'both',
    ARRAY[]::TEXT[],
    true,
    true,
    'Family-owned organic farm growing fresh seasonal produce with sustainable farming practices'
),
(
    'McCormick Jam Co',
    'info@mccormickjam.com',
    '(425) 555-0202',
    'preserves_sauces',
    true,
    'both',
    ARRAY[]::TEXT[],
    true,
    true,
    'Artisan jam and preserve company creating small-batch products with locally sourced fruits'
),
(
    'Mount Forest Beadery',
    'hello@mountforestbeadery.com',
    '(425) 555-0203',
    'crafts_art',
    true,
    'card',
    ARRAY[]::TEXT[],
    true,
    true,
    'Handcrafted jewelry and beadwork featuring natural materials and unique designs'
);

-- Insert example products for each vendor
DO $$
DECLARE
    ayala_farm_id UUID;
    mccormick_jam_id UUID;
    mount_forest_id UUID;
BEGIN
    -- Get vendor IDs
    SELECT id INTO ayala_farm_id FROM vendors WHERE contact_email = 'contact@ayalafamilyfarm.com';
    SELECT id INTO mccormick_jam_id FROM vendors WHERE contact_email = 'info@mccormickjam.com';
    SELECT id INTO mount_forest_id FROM vendors WHERE contact_email = 'hello@mountforestbeadery.com';
    
    -- Insert products for Ayala Family Farm (produce)
    IF ayala_farm_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity, organic, local) VALUES
        (ayala_farm_id, 'Organic Rainbow Chard', 'Colorful organic Swiss chard with vibrant stems, perfect for sautéing or salads', 4.50, 'bunch', 'produce', true, 25, true, true);
    END IF;
    
    -- Insert products for McCormick Jam Co (preserves/sauces)
    IF mccormick_jam_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity, local) VALUES
        (mccormick_jam_id, 'Huckleberry Jam', 'Wild huckleberry jam made in small batches with Pacific Northwest berries', 11.00, 'jar', 'preserves_sauces', true, 15, true);
    END IF;
    
    -- Insert products for Mount Forest Beadery (crafts/art)
    IF mount_forest_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, name, description, price, unit, category, available, stock_quantity, local) VALUES
        (mount_forest_id, 'Handwoven Seed Bead Bracelet', 'Beautiful bracelet handwoven with natural seed beads in earth tone patterns', 28.00, 'each', 'crafts_art', true, 8, true);
    END IF;
END $$;

-- Display results
SELECT 
    'Database updated successfully!' as message,
    (SELECT COUNT(*) FROM vendors) as vendor_count,
    (SELECT COUNT(*) FROM products) as product_count;

-- Show the new vendors and their products
SELECT 
    v.name as vendor_name,
    v.product_type,
    v.contact_email,
    p.name as product_name,
    p.price,
    p.unit,
    p.category
FROM vendors v
LEFT JOIN products p ON v.id = p.vendor_id
ORDER BY v.name, p.name; 