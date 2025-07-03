export interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  product_type: ProductType;
  api_consent: boolean;
  payment_method: 'square' | 'swipe' | 'cash' | 'card' | 'both' | 'oauth' | null;
  available_dates: string[];
  payment_provider?: 'square' | 'stripe';
  payment_connected: boolean;
  payment_connection_id?: string;
  payment_account_id?: string;
  payment_connected_at?: string;
  payment_last_verified?: string;
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
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  order_status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  pickup_time?: string;
  order_date: string;
  order_number: string;
  special_instructions?: string;
  notification_method?: 'email';
  payment_authorization_data?: string; // JSON string containing payment authorization details
  created_at: string;
  updated_at: string;
}

export interface MarketStatus {
  isOpen: boolean;
  nextMarketDate: string | null;
  currentMarketEndTime: string | null;
  activeVendors: Vendor[];
}

export interface PaymentConnection {
  id: string;
  vendor_id: string;
  provider: 'square' | 'stripe';
  provider_account_id: string;
  access_token_hash: string;
  refresh_token_hash?: string;
  token_expires_at?: string;
  scopes: string[];
  webhook_endpoint_id?: string;
  connection_status: 'active' | 'expired' | 'revoked' | 'error';
  last_used_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  vendor_id: string;
  provider: 'square' | 'stripe';
  provider_transaction_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  payment_method_type?: string;
  failure_reason?: string;
  provider_fee?: number;
  net_amount?: number;
  processed_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentOAuthConfig {
  provider: 'square' | 'stripe';
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  state: string;
} 