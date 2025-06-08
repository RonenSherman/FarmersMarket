-- =============================================
-- SCHEMA UPDATES FOR FARMERS MARKET
-- Updates for Square/Swipe payments and delivery addresses
-- =============================================

-- Update vendor payment methods to support square/swipe
ALTER TABLE vendors 
DROP CONSTRAINT IF EXISTS vendors_payment_method_check;

ALTER TABLE vendors 
ADD CONSTRAINT vendors_payment_method_check 
CHECK (payment_method IN ('square', 'swipe'));

-- Update orders table to support delivery addresses
ALTER TABLE orders 
DROP COLUMN IF EXISTS pickup_time;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_address JSONB NOT NULL DEFAULT '{}';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50);

-- Update payment method constraint in orders
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method = 'card');

-- Update existing data (if any) to match new constraints
UPDATE vendors 
SET payment_method = 'square' 
WHERE payment_method IN ('card', 'both');

UPDATE vendors 
SET payment_method = 'swipe' 
WHERE payment_method = 'cash';

UPDATE orders 
SET payment_method = 'card' 
WHERE payment_method IN ('cash', 'both');

-- Add delivery address structure for existing orders
UPDATE orders 
SET delivery_address = '{"street": "", "city": "", "state": "", "zip_code": "", "delivery_instructions": ""}' 
WHERE delivery_address IS NULL OR delivery_address = '{}';

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_orders_delivery_city ON orders USING GIN ((delivery_address->>'city'));
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(order_status, order_date); 