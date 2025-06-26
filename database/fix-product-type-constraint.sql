-- Fix product type constraint in vendors table
-- This ensures the database constraint matches the TypeScript ProductType definition

-- Drop the existing constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_product_type_check;

-- Add the updated constraint with all allowed product types
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