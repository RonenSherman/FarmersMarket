-- =============================================
-- DUVALL FARMERS MARKET DATABASE SCHEMA
-- PostgreSQL + Supabase Implementation
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =============================================
-- 1. VENDORS TABLE
-- Stores all vendor information and applications
-- =============================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    contact_phone VARCHAR(50) NOT NULL,
    product_type VARCHAR(50) NOT NULL CHECK (
        product_type IN (
            'produce', 'baked_goods', 'preserves_sauces', 
            'dairy_eggs', 'meat_seafood', 'beverages', 
            'crafts_art', 'flowers_plants', 'prepared_foods', 'other'
        )
    ),
    api_consent BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'cash', 'both')),
    available_dates TEXT[] NOT NULL DEFAULT '{}',
    is_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    profile_image_url TEXT,
    description TEXT,
    business_address TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vendors table
CREATE INDEX idx_vendors_product_type ON vendors(product_type);
CREATE INDEX idx_vendors_email ON vendors(contact_email);
CREATE INDEX idx_vendors_approved ON vendors(is_approved);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_dates ON vendors USING GIN(available_dates);

-- =============================================
-- 2. PRODUCTS TABLE  
-- Individual products offered by vendors
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) NOT NULL, -- 'each', 'lb', 'dozen', 'pint', etc.
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'produce', 'baked_goods', 'preserves_sauces', 
            'dairy_eggs', 'meat_seafood', 'beverages', 
            'crafts_art', 'flowers_plants', 'prepared_foods', 'other'
        )
    ),
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    minimum_order INTEGER DEFAULT 1,
    maximum_order INTEGER,
    seasonal_availability TEXT[], -- ['spring', 'summer', 'fall', 'winter']
    tags TEXT[] DEFAULT '{}',
    nutritional_info JSONB,
    allergen_info TEXT[],
    organic BOOLEAN DEFAULT false,
    local BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for products table
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_price ON products(price);

-- =============================================
-- 3. MARKET_DATES TABLE
-- Manages market schedule and special events
-- =============================================
CREATE TABLE market_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    start_time TIME DEFAULT '15:00:00', -- 3:00 PM
    end_time TIME DEFAULT '18:30:00',   -- 6:30 PM
    is_active BOOLEAN DEFAULT true,
    is_special_event BOOLEAN DEFAULT false,
    event_name VARCHAR(255),
    event_description TEXT,
    max_vendors INTEGER,
    weather_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'delayed'
    notes TEXT,
    setup_time TIME DEFAULT '14:00:00', -- 2:00 PM
    cleanup_time TIME DEFAULT '19:00:00', -- 7:00 PM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for market_dates table
CREATE INDEX idx_market_dates_date ON market_dates(date);
CREATE INDEX idx_market_dates_active ON market_dates(is_active);
CREATE INDEX idx_market_dates_future ON market_dates(date);

-- =============================================
-- 4. ORDERS TABLE
-- Customer orders (vendor-specific)
-- =============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    items JSONB NOT NULL, -- Array of {product_id, name, price, quantity, subtotal}
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_method VARCHAR(20) CHECK (payment_method IN ('card', 'cash')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refunded')
    ),
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (
        order_status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')
    ),
    pickup_time TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders table
CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- =============================================
-- 5. ADMIN_USERS TABLE
-- Market administrators and staff
-- =============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (
        role IN ('super_admin', 'admin', 'coordinator', 'volunteer')
    ),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin_users table
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- =============================================
-- 6. CUSTOMER_FEEDBACK TABLE
-- Reviews and feedback system
-- =============================================
CREATE TABLE customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    response TEXT, -- Vendor response
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for customer_feedback table
CREATE INDEX idx_feedback_vendor ON customer_feedback(vendor_id);
CREATE INDEX idx_feedback_rating ON customer_feedback(rating);
CREATE INDEX idx_feedback_public ON customer_feedback(is_public);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    order_num TEXT;
    date_part TEXT;
    counter INTEGER;
BEGIN
    -- Get date part (YYYYMMDD)
    date_part := to_char(NEW.order_date, 'YYYYMMDD');
    
    -- Get next counter for this date
    SELECT COALESCE(MAX(CAST(RIGHT(order_number, 3) AS INTEGER)), 0) + 1
    INTO counter
    FROM orders 
    WHERE order_number LIKE date_part || '-%';
    
    -- Generate order number: YYYYMMDD-001
    order_num := date_part || '-' || LPAD(counter::TEXT, 3, '0');
    
    NEW.order_number := order_num;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for order number generation
CREATE TRIGGER generate_order_number_trigger 
BEFORE INSERT ON orders 
FOR EACH ROW 
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Vendors can read their own data
CREATE POLICY "Vendors can view own data" ON vendors FOR SELECT USING (auth.jwt() ->> 'email' = contact_email);
CREATE POLICY "Vendors can update own data" ON vendors FOR UPDATE USING (auth.jwt() ->> 'email' = contact_email);

-- Products policies
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (available = true);
CREATE POLICY "Vendors can manage own products" ON products FOR ALL USING (
    vendor_id IN (SELECT id FROM vendors WHERE contact_email = auth.jwt() ->> 'email')
);

-- Market dates are publicly readable
CREATE POLICY "Anyone can view market dates" ON market_dates FOR SELECT USING (true);

-- Orders policies  
CREATE POLICY "Vendors can view own orders" ON orders FOR SELECT USING (
    vendor_id IN (SELECT id FROM vendors WHERE contact_email = auth.jwt() ->> 'email')
);

-- Public read access for approved vendors and available products
CREATE POLICY "Public can view approved vendors" ON vendors FOR SELECT USING (is_approved = true AND is_active = true);

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert upcoming Thursday market dates
-- Note: Run this separately after schema creation if needed
-- INSERT INTO market_dates (date, is_active) 
-- SELECT 
--     (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER + (n * 7))::DATE as market_date,
--     true
-- FROM generate_series(0, 11) n  -- Next 12 Thursdays
-- WHERE (CURRENT_DATE + (4 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER + (n * 7))::DATE >= CURRENT_DATE;

-- Note: Initial data (admin user, market dates, sample vendors) 
-- is now in separate initial-data.sql file

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- Vendor performance view
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
WHERE v.is_approved = true
GROUP BY v.id, v.name, v.product_type, v.contact_email;

-- Market date performance view
CREATE VIEW market_analytics AS
SELECT 
    md.date,
    md.is_active,
    md.is_special_event,
    md.event_name,
    COUNT(DISTINCT o.vendor_id) as active_vendors,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total), 0) as total_revenue,
    COUNT(DISTINCT o.customer_email) as unique_customers
FROM market_dates md
LEFT JOIN orders o ON md.date = o.order_date AND o.order_status = 'completed'
GROUP BY md.date, md.is_active, md.is_special_event, md.event_name
ORDER BY md.date DESC;

-- =============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================

-- Function to check if market is currently open
CREATE OR REPLACE FUNCTION is_market_open()
RETURNS BOOLEAN AS $$
DECLARE
    current_day INTEGER;
    now_time TIME;
    market_start TIME := '15:00:00';
    market_end TIME := '18:30:00';
BEGIN
    current_day := EXTRACT(DOW FROM NOW()); -- 0=Sunday, 4=Thursday
    now_time := LOCALTIME;
    
    -- Market is open on Thursdays (4) between 3:00 PM and 6:30 PM
    IF current_day = 4 AND now_time >= market_start AND now_time <= market_end THEN
        -- Check if there's an active market date for today
        RETURN EXISTS (
            SELECT 1 FROM market_dates 
            WHERE date = CURRENT_DATE AND is_active = true
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get next market date
CREATE OR REPLACE FUNCTION next_market_date()
RETURNS DATE AS $$
BEGIN
    RETURN (
        SELECT date 
        FROM market_dates 
        WHERE date > CURRENT_DATE AND is_active = true 
        ORDER BY date 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Composite indexes for common queries
CREATE INDEX idx_orders_vendor_date ON orders(vendor_id, order_date);
CREATE INDEX idx_orders_date_status ON orders(order_date, order_status);
CREATE INDEX idx_products_vendor_available ON products(vendor_id, available);
CREATE INDEX idx_products_category_available ON products(category, available);

-- Partial indexes for performance
CREATE INDEX idx_active_vendors ON vendors(name) WHERE is_approved = true AND is_active = true;
CREATE INDEX idx_available_products ON products(name) WHERE available = true;
CREATE INDEX idx_future_markets ON market_dates(date) WHERE is_active = true;

-- Database comment (handled by Supabase interface)
-- COMMENT: 'Duvall Farmers Market - PostgreSQL Database with Supabase integration'

-- Grant necessary permissions for Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Allow anonymous users to view public data
GRANT SELECT ON vendors, products, market_dates TO anon;

-- Fix vendor insertion policy for anonymous users
DROP POLICY IF EXISTS "Allow vendor registration" ON vendors;
CREATE POLICY "Allow vendor registration" ON vendors 
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous vendor signup" ON vendors 
FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous vendor signup
CREATE POLICY "Allow anonymous vendor signup" ON vendors 
FOR INSERT 
TO anon 
WITH CHECK (true); 