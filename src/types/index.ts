export interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  product_type: ProductType;
  api_consent: boolean;
  payment_method: 'square' | 'swipe';
  available_dates: string[];
  created_at: string;
  updated_at: string;
}

export type ProductType = 
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'baked_goods'
  | 'crafts'
  | 'artisan_goods'
  | 'flowers'
  | 'honey'
  | 'preserves';

export type PricingUnit = 
  | 'each'
  | 'lb'
  | 'kg'
  | 'oz'
  | 'dozen'
  | 'pint'
  | 'quart'
  | 'gallon'
  | 'bunch'
  | 'bottle'
  | 'jar'
  | 'bag'
  | 'box'
  | 'case'
  | 'loaf'
  | 'slice'
  | 'piece'
  | 'yard'
  | 'sq ft'
  | 'other';

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  'each': 'Each',
  'lb': 'Pound (lb)',
  'kg': 'Kilogram (kg)',
  'oz': 'Ounce (oz)',
  'dozen': 'Dozen',
  'pint': 'Pint',
  'quart': 'Quart',
  'gallon': 'Gallon',
  'bunch': 'Bunch',
  'bottle': 'Bottle',
  'jar': 'Jar',
  'bag': 'Bag',
  'box': 'Box',
  'case': 'Case',
  'loaf': 'Loaf',
  'slice': 'Slice',
  'piece': 'Piece',
  'yard': 'Yard',
  'sq ft': 'Square Foot',
  'other': 'Other'
};

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  unit: PricingUnit;
  image_url?: string;
  category: ProductType;
  available: boolean;
  stock_quantity?: number;
  minimum_order?: number;
  maximum_order?: number;
  organic?: boolean;
  local?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketDate {
  id: string;
  date: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  weather_status: 'scheduled' | 'cancelled' | 'delayed';
  is_special_event: boolean;
  event_name?: string;
  event_description?: string;
  notes?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface VendorCart {
  vendor_id: string;
  vendor_name: string;
  items: CartItem[];
  total: number;
}

export interface Order {
  id: string;
  vendor_id: string;
  customer_email: string;
  customer_phone?: string;
  customer_name: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'card' | 'cash';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  pickup_time?: string;
  order_date: string;
  order_number: string;
  special_instructions?: string;
  notification_method?: 'email';
  created_at: string;
  updated_at: string;
}

export interface MarketStatus {
  isOpen: boolean;
  nextMarketDate: string | null;
  currentMarketEndTime: string | null;
  activeVendors: Vendor[];
} 