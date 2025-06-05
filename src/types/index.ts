export interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  product_type: ProductType;
  api_consent: boolean;
  payment_method: 'card' | 'cash' | 'both';
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

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: ProductType;
  available: boolean;
  stock_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface MarketDate {
  id: string;
  date: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
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
  customer_phone: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  order_date: string;
  pickup_time?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketStatus {
  isOpen: boolean;
  nextMarketDate: string | null;
  currentMarketEndTime: string | null;
  activeVendors: Vendor[];
} 