import { supabase, TABLES } from './supabase';
import { Vendor, Product, MarketDate, Order, ProductType } from '@/types';

// Vendor Operations
export const vendorService = {
  // Create a new vendor
  async create(vendorData: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .insert([{
        ...vendorData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  // Get all vendors
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Vendor[];
  },

  // Get vendors by product type
  async getByProductType(productType: ProductType) {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .select('*')
      .eq('product_type', productType)
      .order('name');

    if (error) throw error;
    return data as Vendor[];
  },

  // Get vendors available on a specific date
  async getAvailableOnDate(date: string) {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .select('*')
      .contains('available_dates', [date])
      .order('name');

    if (error) throw error;
    return data as Vendor[];
  },

  // Update vendor
  async update(id: string, updates: Partial<Vendor>) {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  // Get vendor by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  // Delete vendor
  async delete(id: string) {
    const { error } = await supabase
      .from(TABLES.VENDORS)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Product Operations
export const productService = {
  // Create a new product
  async create(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .insert([{
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // Get all products
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type,
          payment_method
        )
      `)
      .eq('available', true)
      .order('name');

    if (error) throw error;
    return data as (Product & { vendors: Vendor })[];
  },

  // Get products by vendor
  async getByVendor(vendorId: string) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('available', true)
      .order('name');

    if (error) throw error;
    return data as Product[];
  },

  // Get products by category
  async getByCategory(category: ProductType) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type,
          payment_method
        )
      `)
      .eq('category', category)
      .eq('available', true)
      .order('name');

    if (error) throw error;
    return data as (Product & { vendors: Vendor })[];
  },

  // Update product
  async update(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // Delete product
  async delete(id: string) {
    const { error } = await supabase
      .from(TABLES.PRODUCTS)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Reduce stock quantity when item is purchased
  async reduceStock(id: string, quantityToReduce: number) {
    // First get current stock
    const { data: product, error: getError } = await supabase
      .from(TABLES.PRODUCTS)
      .select('stock_quantity')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    if (product.stock_quantity === null || product.stock_quantity === undefined) {
      // If no stock tracking, just return
      return;
    }

    const newStock = Math.max(0, product.stock_quantity - quantityToReduce);

    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }
};

// Market Date Operations
export const marketDateService = {
  // Create a new market date
  async create(dateData: Omit<MarketDate, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from(TABLES.MARKET_DATES)
      .insert([{
        ...dateData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data as MarketDate;
  },

  // Get all market dates
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.MARKET_DATES)
      .select('*')
      .order('date');

    if (error) throw error;
    return data as MarketDate[];
  },

  // Get upcoming market dates
  async getUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLES.MARKET_DATES)
      .select('*')
      .gte('date', today)
      .eq('is_active', true)
      .order('date')
      .limit(10);

    if (error) throw error;
    return data as MarketDate[];
  },

  // Get today's market (if exists)
  async getToday() {
    // Use local date instead of UTC to avoid timezone issues
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const { data, error } = await supabase
      .from(TABLES.MARKET_DATES)
      .select('*')
      .eq('date', today)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data as MarketDate | null;
  },

  // Update market date
  async update(id: string, updates: Partial<MarketDate>) {
    const { data, error } = await supabase
      .from(TABLES.MARKET_DATES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MarketDate;
  }
};

// Order Operations
export const orderService = {
  // Create a new order
  async create(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .insert([{
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },

  // Create order and reduce inventory
  async createWithInventoryUpdate(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
    // First, reduce inventory for all items
    const inventoryUpdates = orderData.items.map(async (item) => {
      return productService.reduceStock(item.product.id, item.quantity);
    });

    try {
      // Execute all inventory updates
      await Promise.all(inventoryUpdates);

      // Create the order
      const order = await this.create(orderData);
      return order;
    } catch (error) {
      // If inventory update fails, don't create the order
      throw new Error('Unable to process order: insufficient inventory or system error');
    }
  },

  // Get orders by vendor
  async getByVendor(vendorId: string) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  // Get orders by date
  async getByDate(date: string) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type
        )
      `)
      .eq('order_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (Order & { vendors: Vendor })[];
  },

  // Update order status
  async updateStatus(id: string, order_status: Order['order_status']) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({
        order_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },

  // Get all orders (admin view)
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type,
          payment_method
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (Order & { vendors: Vendor })[];
  },

  // Get order by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type,
          payment_method
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order & { vendors: Vendor };
  },

  // Delete order (admin only - for removing cancelled orders)
  async delete(id: string) {
    console.log('🗑️ Deleting order:', id);
    
    const { error } = await supabase
      .from(TABLES.ORDERS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Failed to delete order:', error);
      throw error;
    }
    
    console.log('✅ Order deleted successfully');
    return true;
  }
};

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to vendor changes
  subscribeToVendors(callback: (payload: any) => void) {
    return supabase
      .channel('vendors-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.VENDORS
      }, callback)
      .subscribe();
  },

  // Subscribe to product changes
  subscribeToProducts(callback: (payload: any) => void) {
    return supabase
      .channel('products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.PRODUCTS
      }, callback)
      .subscribe();
  },

  // Subscribe to order changes
  subscribeToOrders(callback: (payload: any) => void) {
    return supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.ORDERS
      }, callback)
      .subscribe();
  }
};

// Analytics and Dashboard Data
export const analyticsService = {
  // Get vendor statistics
  async getVendorStats() {
    const { data, error } = await supabase
      .from(TABLES.VENDORS)
      .select('product_type')
      .eq('api_consent', true);

    if (error) throw error;

    // Count by product type
    const stats = data.reduce((acc, vendor) => {
      acc[vendor.product_type] = (acc[vendor.product_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  },

  // Get order statistics for a date range
  async getOrderStats(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('total, status, created_at')
      .gte('order_date', startDate)
      .lte('order_date', endDate);

    if (error) throw error;

    const totalRevenue = data.reduce((sum, order) => sum + order.total, 0);
    const orderCount = data.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      totalRevenue,
      orderCount,
      avgOrderValue,
      orders: data
    };
  }
}; 