'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { vendorService, productService, marketDateService, orderService } from '@/lib/database';
import CameraUpload from '@/components/CameraUpload';
import { notificationService } from '@/lib/notifications';
import { customerNotificationService } from '@/lib/customerNotifications';
import { useMarketStore } from '@/store/marketStore';
import type { Vendor, Product, MarketDate, Order, PricingUnit, ProductType } from '@/types';
import { PRICING_UNIT_LABELS } from '@/types';

interface AdminState {
  isAuthenticated: boolean;
  vendors: Vendor[];
  products: Product[];
  marketDates: MarketDate[];
  orders: (Order & { vendors: Vendor })[];
  selectedVendor: Vendor | null;
  editingProduct: Product | null;
  editingVendor: Vendor | null;
  loading: boolean;
  newOrdersCount: number;
}

export default function AdminPage() {
  const { refreshProducts } = useMarketStore();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<AdminState>({
    isAuthenticated: false,
    vendors: [],
    products: [],
    marketDates: [],
    orders: [],
    selectedVendor: null,
    editingProduct: null,
    editingVendor: null,
    loading: false,
    newOrdersCount: 0
  });

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'produce' as const,
    unit: 'each' as PricingUnit,
    stock_quantity: '',
    image_url: ''
  });

  const [editProductForm, setEditProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'produce' as any,
    unit: 'each' as PricingUnit,
    stock_quantity: '',
    available: true,
    image_url: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const [newDateForm, setNewDateForm] = useState({
    date: '',
    start_time: '15:00',
    end_time: '18:30',
    weather_status: 'scheduled' as const
  });

  const [editVendorForm, setEditVendorForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    product_type: 'produce' as ProductType,
    payment_method: 'cash' as Vendor['payment_method'],
    business_description: ''
  });

  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    product_type: 'produce' as ProductType,
    payment_method: 'cash' as Vendor['payment_method'],
    business_description: ''
  });

  const [showCreateVendor, setShowCreateVendor] = useState(false);

  // Admin password from environment variable
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'farmersmarket2024';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setState(prev => ({ ...prev, isAuthenticated: true }));
      notificationService.setAdminLoginStatus(true);
      loadAdminData();
      toast.success('Welcome to admin panel');
    } else {
      toast.error('Invalid password');
    }
  };

  const loadAdminData = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const [vendors, products, marketDates, orders] = await Promise.all([
        vendorService.getAll(),
        productService.getAll(),
        marketDateService.getAll(),
        orderService.getAll()
      ]);
      
      // Count new orders (pending status)
      const newOrdersCount = orders.filter(order => order.order_status === 'pending').length;
      
      setState(prev => ({
        ...prev,
        vendors,
        products,
        marketDates,
        orders,
        newOrdersCount,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This will also delete all their products.')) {
      return;
    }

    try {
      await vendorService.delete(vendorId);
      toast.success('Vendor deleted successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setState(prev => ({ ...prev, editingVendor: vendor }));
    setEditVendorForm({
      name: vendor.name,
      contact_email: vendor.contact_email,
      contact_phone: vendor.contact_phone || '',
      product_type: vendor.product_type,
      payment_method: vendor.payment_method || 'cash',
      business_description: ''
    });
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.editingVendor) return;

    try {
      await vendorService.update(state.editingVendor.id, {
        name: editVendorForm.name,
        contact_email: editVendorForm.contact_email,
        contact_phone: editVendorForm.contact_phone || undefined,
        product_type: editVendorForm.product_type,
        payment_method: editVendorForm.payment_method,
      });

      toast.success('Vendor updated successfully');
      setState(prev => ({ ...prev, editingVendor: null }));
      setEditVendorForm({
        name: '',
        contact_email: '',
        contact_phone: '',
        product_type: 'produce',
        payment_method: 'cash',
        business_description: ''
      });
      loadAdminData();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await vendorService.create({
        name: newVendorForm.name,
        contact_email: newVendorForm.contact_email,
        contact_phone: newVendorForm.contact_phone || '',
        product_type: newVendorForm.product_type,
        payment_method: newVendorForm.payment_method,
        api_consent: true,
        available_dates: [],
        payment_connected: false,
        payment_provider: undefined,
        payment_connection_id: undefined,
        payment_account_id: undefined
      });

      toast.success('Vendor created successfully');
      setNewVendorForm({
        name: '',
        contact_email: '',
        contact_phone: '',
        product_type: 'produce',
        payment_method: 'cash',
        business_description: ''
      });
      setShowCreateVendor(false);
      loadAdminData();
    } catch (error) {
      console.error('Error creating vendor:', error);
      toast.error('Failed to create vendor');
    }
  };

  const handleCancelVendorEdit = () => {
    setState(prev => ({ ...prev, editingVendor: null }));
    setEditVendorForm({
      name: '',
      contact_email: '',
      contact_phone: '',
      product_type: 'produce',
      payment_method: 'cash',
      business_description: ''
    });
  };

  const handleConnectPayment = async (vendorId: string, provider: 'square' | 'stripe') => {
    try {
      // Generate OAuth URL via server-side endpoint
      const response = await fetch('/api/oauth/generate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          vendorId,
          source: 'admin'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate OAuth URL');
      }

      const { authUrl } = await response.json();
      
      // Open OAuth URL in new window
      window.open(authUrl, '_blank');
      toast.success(`Opening ${provider} authorization window...`);
    } catch (error) {
      console.error('Error initiating payment connection:', error);
      toast.error(`Failed to start payment connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnectPayment = async (vendorId: string) => {
    if (!confirm('Are you sure you want to disconnect the payment provider? This will disable payment processing for this vendor.')) {
      return;
    }

    try {
      const vendor = state.vendors.find(v => v.id === vendorId);
      if (!vendor?.payment_provider) {
        toast.error('No payment provider connected');
        return;
      }

      // Import the OAuth service dynamically
      const { PaymentOAuthService } = await import('@/lib/paymentOAuth');
      await PaymentOAuthService.disconnectProvider(vendorId, vendor.payment_provider);

      toast.success('Payment provider disconnected');
      loadAdminData();
    } catch (error) {
      console.error('Error disconnecting payment:', error);
      toast.error('Failed to disconnect payment provider');
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    // In a real application, you would upload to a cloud service like AWS S3, Cloudinary, etc.
    // For this demo, we'll create a mock upload that returns a data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedVendor) {
      toast.error('Please select a vendor first');
      return;
    }

    try {
      let imageUrl = newProductForm.image_url;
      
      // If a photo was selected, upload it
      if (selectedPhoto) {
        toast.loading('Uploading photo...');
        imageUrl = await uploadPhoto(selectedPhoto);
        toast.dismiss();
      }

      await productService.create({
        vendor_id: state.selectedVendor.id,
        name: newProductForm.name,
        price: parseFloat(newProductForm.price),
        description: newProductForm.description,
        category: newProductForm.category,
        image_url: imageUrl || undefined,
        unit: newProductForm.unit,
        stock_quantity: newProductForm.stock_quantity ? parseInt(newProductForm.stock_quantity) : undefined,
        available: true
      });

      toast.success('Product added successfully');
      setNewProductForm({
        name: '',
        price: '',
        description: '',
        category: 'produce',
        unit: 'each',
        stock_quantity: '',
        image_url: ''
      });
      setSelectedPhoto(null);
      loadAdminData();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setState(prev => ({ ...prev, editingProduct: product }));
    setEditProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description || '',
      category: product.category,
      unit: product.unit,
      stock_quantity: product.stock_quantity?.toString() || '',
      available: product.available,
      image_url: product.image_url || ''
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.editingProduct) return;

    try {
      await productService.update(state.editingProduct.id, {
        name: editProductForm.name,
        price: parseFloat(editProductForm.price),
        description: editProductForm.description,
        category: editProductForm.category,
        unit: editProductForm.unit,
        stock_quantity: editProductForm.stock_quantity ? parseInt(editProductForm.stock_quantity) : undefined,
        available: editProductForm.available,
        image_url: editProductForm.image_url || undefined,
      });

      toast.success('Product updated successfully');
      setState(prev => ({ ...prev, editingProduct: null }));
      loadAdminData();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleCancelEdit = () => {
    setState(prev => ({ ...prev, editingProduct: null }));
    setEditProductForm({
      name: '',
      price: '',
      description: '',
      category: 'produce',
      unit: 'each',
      stock_quantity: '',
      available: true,
      image_url: ''
    });
  };

  const handleAddMarketDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await marketDateService.create({
        date: newDateForm.date,
        is_active: newDateForm.weather_status === 'scheduled',
        start_time: newDateForm.start_time,
        end_time: newDateForm.end_time,
        weather_status: newDateForm.weather_status,
        is_special_event: false,
        notes: undefined
      });

      toast.success('Market date added successfully');
      setNewDateForm({
        date: '',
        start_time: '15:00',
        end_time: '18:30',
        weather_status: 'scheduled'
      });
      loadAdminData();
    } catch (error) {
      console.error('Error adding market date:', error);
      toast.error('Failed to add market date');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productService.delete(productId);
      toast.success('Product deleted successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateMarketDate = async (dateId: string, weather_status: 'scheduled' | 'cancelled' | 'delayed') => {
    try {
      await marketDateService.update(dateId, { weather_status });
      toast.success('Market date updated successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error updating market date:', error);
      toast.error('Failed to update market date');
    }
  };

  const handleUpdateMarketDateTimes = async (dateId: string, start_time: string, end_time: string) => {
    try {
      await marketDateService.update(dateId, { start_time, end_time });
      toast.success('Market times updated successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error updating market times:', error);
      toast.error('Failed to update market times');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, order_status: Order['order_status']) => {
    // Confirmation for cancellation
    if (order_status === 'cancelled') {
      if (!confirm('Are you sure you want to cancel this order? The customer will be notified via email.')) {
        return;
      }
    }

    try {
      console.log(`🔄 Updating order ${orderId} status to ${order_status}`);
      
      // Get the order details before updating
      const order = state.orders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      // Check if this is a pending → confirmed transition (reduce inventory)
      const isConfirmingPendingOrder = order.order_status === 'pending' && order_status === 'confirmed';
      
      // Check if this is a confirmed → cancelled transition (restore inventory)
      const isCancellingConfirmedOrder = order.order_status === 'confirmed' && order_status === 'cancelled';
      
      if (isConfirmingPendingOrder) {
        console.log('📦 Confirming pending order - reducing inventory for all items');
        
        // Reduce inventory for all items in the order
        const inventoryUpdates = order.items.map(async (item) => {
          console.log(`📉 Reducing stock for ${item.product.name}: -${item.quantity}`);
          return await productService.reduceStock(item.product.id, item.quantity);
        });

        try {
          // Execute all inventory updates
          await Promise.all(inventoryUpdates);
          console.log('✅ All inventory reductions completed successfully');
          
          // Refresh product data in the store to reflect inventory changes
          await refreshProducts();
        } catch (inventoryError) {
          console.error('❌ Failed to reduce inventory:', inventoryError);
          toast.error('Failed to reduce inventory. Please check stock levels and try again.');
          return; // Don't proceed with status update if inventory fails
        }
      }

      if (isCancellingConfirmedOrder) {
        console.log('🔄 Cancelling confirmed order - restoring inventory for all items');
        
        // Restore inventory for all items in the order
        const inventoryRestores = order.items.map(async (item) => {
          console.log(`📈 Restoring stock for ${item.product.name}: +${item.quantity}`);
          return await productService.restoreStock(item.product.id, item.quantity);
        });

        try {
          // Execute all inventory restores
          await Promise.all(inventoryRestores);
          console.log('✅ All inventory restored successfully');
          
          // Refresh product data in the store to reflect inventory changes
          await refreshProducts();
        } catch (inventoryError) {
          console.error('❌ Failed to restore inventory:', inventoryError);
          toast.error('Failed to restore inventory. Status will still be updated.');
          // Don't return here - we still want to update the status even if restore fails
        }
      }

      // Update order status in database
      await orderService.updateStatus(orderId, order_status);
      
      // Send notification to customer about status update
      try {
        const response = await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: { ...order, order_status },
            notificationMethod: 'email' as const,
            type: 'status_update'
          })
        });

        if (!response.ok) {
          console.error('Failed to send notification');
        } else {
          console.log('✅ Notification sent successfully');
        }
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      // Show success message with context
      const statusMessages = {
        'pending': 'marked as pending',
        'confirmed': 'confirmed - customer will be notified',
        'ready': 'marked as ready for pickup - customer will be notified',
        'completed': 'marked as completed',
        'cancelled': 'cancelled - customer will be notified'
      };
      
      toast.success(`Order #${order.order_number} ${statusMessages[order_status]}`);
      
      // Reload data to reflect changes
      loadAdminData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    // Only allow removal of cancelled orders
    if (order.order_status !== 'cancelled') {
      toast.error('Only cancelled orders can be removed');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently remove this cancelled order?\n\nOrder #${order.order_number}\nCustomer: ${order.customer_name}\nTotal: $${order.total.toFixed(2)}\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`🗑️ Removing cancelled order: ${orderId}`);
      
      await orderService.delete(orderId);
      
      toast.success(`Order #${order.order_number} removed successfully`);
      
      // Reload data to reflect changes
      loadAdminData();
    } catch (error) {
      console.error('Error removing order:', error);
      toast.error('Failed to remove order');
    }
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-earth-800 mb-6 text-center">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-earth-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-market-600 text-white py-3 px-4 rounded-lg hover:bg-market-700 transition-colors font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-market-600"></div>
          <p className="mt-4 text-earth-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-earth-800">Admin Dashboard</h1>
            {state.newOrdersCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse self-start sm:self-auto">
                {state.newOrdersCount} New Order{state.newOrdersCount > 1 ? 's' : ''}!
              </div>
            )}
          </div>
          <button
            onClick={() => setState(prev => ({ ...prev, isAuthenticated: false }))}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 w-full sm:w-auto"
          >
            Logout
          </button>
        </div>

        {/* Orders Section - Full Width */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-earth-800 mb-4 flex items-center">
            Orders ({state.orders.length})
            {state.newOrdersCount > 0 && (
              <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                {state.newOrdersCount} pending
              </span>
            )}
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {state.orders.length === 0 ? (
              <p className="text-earth-600 italic">No orders yet</p>
            ) : (
              state.orders.map((order) => (
                <div key={order.id} className="border border-earth-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-earth-800">Order #{order.order_number}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.order_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.order_status === 'ready' ? 'bg-green-100 text-green-800' :
                          order.order_status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.order_status}
                        </span>
                      </div>
                      <p className="text-sm text-earth-600">👤 {order.customer_name}</p>
                      <p className="text-sm text-earth-600">📧 {order.customer_email}</p>
                      {order.customer_phone && (
                        <p className="text-sm text-earth-600">📞 {order.customer_phone}</p>
                      )}
                      <p className="text-sm text-earth-600">🏪 {order.vendors.name}</p>
                      <p className="text-sm text-earth-600">💰 ${order.total.toFixed(2)}</p>
                      <p className="text-sm text-earth-500">📅 {new Date(order.created_at).toLocaleDateString()}</p>
                      
                      {/* Order Items Breakdown */}
                      <div className="mt-3 p-3 bg-earth-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-sm text-earth-800">📦 Order Items</strong>
                          <span className="text-xs text-earth-500">{order.items?.length || 0} items</span>
                        </div>
                        {/* Debug info - remove this later */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-500 mb-2">
                            Debug: Items type: {typeof order.items}, Length: {order.items?.length}
                          </div>
                        )}
                        {(() => {
                          // Handle different formats of items data
                          let items: any = order.items;
                          
                          // If items is a string, try to parse it as JSON
                          if (typeof items === 'string') {
                            try {
                              items = JSON.parse(items);
                            } catch (e) {
                              console.error('Failed to parse items JSON:', e);
                              items = [];
                            }
                          }
                          
                          return items && Array.isArray(items) && items.length > 0 ? (
                            <div className="space-y-2">
                              {items.map((item, index) => (
                              <div key={index} className="flex justify-between items-center py-1 border-b border-earth-200 last:border-b-0">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-earth-800">{item.product.name}</p>
                                  <p className="text-xs text-earth-600">
                                    ${item.product.price.toFixed(2)} per {item.product.unit}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-earth-800">
                                    {item.quantity}x = ${(item.product.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-earth-300">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-earth-800">Subtotal:</span>
                                <span className="text-sm font-semibold text-earth-800">${order.subtotal.toFixed(2)}</span>
                              </div>
                              {order.tax > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-earth-600">Tax:</span>
                                  <span className="text-xs text-earth-600">${order.tax.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-sm text-earth-800">Total:</span>
                                <span className="text-sm text-earth-800">${order.total.toFixed(2)}</span>
                              </div>
                                                         </div>
                           </div>
                         ) : (
                           <div className="text-xs text-earth-500">
                             <p className="italic">No structured item details available</p>
                             {/* Fallback: try to parse from special_instructions if items are missing */}
                             {order.special_instructions && (
                               <div className="mt-2 p-2 bg-yellow-50 rounded">
                                 <p className="font-medium">Raw order data:</p>
                                 <pre className="whitespace-pre-wrap text-xs">{order.special_instructions}</pre>
                               </div>
                             )}
                           </div>
                         );
                        })()}
                       </div>
                      
                      {order.special_instructions && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-earth-600">
                          <strong>📝 Special Instructions:</strong>
                          <p className="text-xs mt-1 whitespace-pre-wrap">{order.special_instructions}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 min-w-0">
                      {/* Status Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {order.order_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors font-medium"
                              title="Confirm Order"
                            >
                              ✅ Confirm Order
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors font-medium border-2 border-red-700"
                              title="Cancel Order - This will notify the customer"
                            >
                              ❌ Cancel Order
                            </button>
                          </>
                        )}
                        {order.order_status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                              className="bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors font-medium"
                              title="Mark as Ready for Pickup"
                            >
                              📦 Mark Ready
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors font-medium border-2 border-red-700"
                              title="Cancel Order - This will notify the customer"
                            >
                              ❌ Cancel Order
                            </button>
                          </>
                        )}
                        {order.order_status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="bg-purple-600 text-white px-3 py-2 rounded text-xs hover:bg-purple-700 transition-colors font-medium"
                            title="Mark as Completed"
                          >
                            🎉 Complete Order
                          </button>
                        )}
                        {order.order_status === 'completed' && (
                          <span className="text-xs text-earth-500 italic">Order completed</span>
                        )}
                        {order.order_status === 'cancelled' && (
                          <button
                            onClick={() => handleRemoveOrder(order.id)}
                            className="bg-gray-600 text-white px-3 py-2 rounded text-xs hover:bg-gray-700 transition-colors font-medium border-2 border-gray-700"
                            title="Remove this cancelled order from the list - This action cannot be undone"
                          >
                            🗑️ Remove Order
                          </button>
                        )}
                      </div>
                      
                      {/* Notification Method Display */}
                      <div className="text-xs text-earth-500">
                        📧 Email notifications enabled
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Vendors Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-earth-800">
              Vendors ({state.vendors.length})
            </h2>
              <button
                onClick={() => setShowCreateVendor(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                + Add New Vendor
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {state.vendors.map((vendor) => (
                <div key={vendor.id} className="border border-earth-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-earth-800">{vendor.name}</h3>
                      <p className="text-sm text-earth-600">📧 {vendor.contact_email}</p>
                      <p className="text-sm text-earth-600">📞 {vendor.contact_phone}</p>
                      <p className="text-sm text-earth-600 capitalize">🏷️ {vendor.product_type}</p>
                      <p className="text-sm text-earth-600">💳 {vendor.payment_method}</p>
                      
                      {/* Payment Connection Status */}
                      <div className="mt-2 flex items-center space-x-2">
                        {vendor.payment_connected && vendor.payment_provider ? (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ {vendor.payment_provider.toUpperCase()} Connected
                            </span>
                            <button
                              onClick={() => handleDisconnectPayment(vendor.id)}
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Disconnect
                            </button>
                    </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠️ No Payment Connected
                            </span>
                            <button
                              onClick={() => handleConnectPayment(vendor.id, 'square')}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Connect Square
                            </button>
                            <button
                              onClick={() => handleConnectPayment(vendor.id, 'stripe')}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                            >
                              Connect Stripe
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleEditVendor(vendor)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, selectedVendor: vendor }))}
                        className="bg-market-600 text-white px-3 py-1 rounded text-sm hover:bg-market-700"
                      >
                        📦 Add Product
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Product Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-800 mb-4">
              Add Product
              {state.selectedVendor && (
                <span className="text-sm font-normal text-earth-600 ml-2">
                  for {state.selectedVendor.name}
                </span>
              )}
            </h2>
            {state.selectedVendor ? (
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="input-field"
                  >
                    <option value="produce">Produce</option>
                    <option value="baked_goods">Baked Goods</option>
                    <option value="preserves_sauces">Preserves & Sauces</option>
                    <option value="dairy_eggs">Dairy & Eggs</option>
                    <option value="meat_seafood">Meat & Seafood</option>
                    <option value="beverages">Beverages</option>
                    <option value="crafts_art">Crafts & Art</option>
                    <option value="flowers_plants">Flowers & Plants</option>
                    <option value="prepared_foods">Prepared Foods</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, unit: e.target.value as PricingUnit }))}
                    className="input-field"
                  >
                    {Object.entries(PRICING_UNIT_LABELS).map(([unit, label]) => (
                      <option key={unit} value={unit}>{label}</option>
                    ))}
                                      </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-700 mb-1">
                      Stock Quantity (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newProductForm.stock_quantity}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      className="input-field"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-earth-700 mb-3">
                      Product Photo
                    </label>
                  <CameraUpload
                    onImageCapture={setSelectedPhoto}
                    existingImage={newProductForm.image_url}
                    className="mb-4"
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-earth-700 mb-1">
                      Or enter image URL
                    </label>
                    <input
                      type="url"
                      value={newProductForm.image_url}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                      className="input-field"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProductForm.description}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-market-600 text-white py-2 px-4 rounded-lg hover:bg-market-700"
                >
                  Add Product
                </button>
              </form>
            ) : (
              <p className="text-earth-600">Select a vendor to add products</p>
            )}
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-800 mb-4">
              Products ({state.products.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {state.products.map((product) => {
                const vendor = state.vendors.find(v => v.id === product.vendor_id);
                return (
                  <div key={product.id} className="border border-earth-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-earth-800">{product.name}</h3>
                        <p className="text-sm text-earth-600">Vendor: {vendor?.name}</p>
                        <p className="text-sm text-earth-600">${product.price.toFixed(2)} per {PRICING_UNIT_LABELS[product.unit as PricingUnit]}</p>
                        <p className="text-sm text-earth-600 capitalize">{product.category}</p>
                        {product.stock_quantity !== undefined && (
                          <p className="text-sm text-earth-600">Stock: {product.stock_quantity}</p>
                        )}
                        <p className="text-sm text-earth-600">Status: {product.available ? '✅ Available' : '❌ Unavailable'}</p>
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded mt-2"
                          />
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit Product Section */}
          {state.editingProduct && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-earth-800 mb-4">
                Edit Product: {state.editingProduct.name}
              </h2>
              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editProductForm.price}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editProductForm.category}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="input-field"
                  >
                    <option value="produce">Produce</option>
                    <option value="baked_goods">Baked Goods</option>
                    <option value="preserves_sauces">Preserves & Sauces</option>
                    <option value="dairy_eggs">Dairy & Eggs</option>
                    <option value="meat_seafood">Meat & Seafood</option>
                    <option value="beverages">Beverages</option>
                    <option value="crafts_art">Crafts & Art</option>
                    <option value="flowers_plants">Flowers & Plants</option>
                    <option value="prepared_foods">Prepared Foods</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={editProductForm.unit}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, unit: e.target.value as PricingUnit }))}
                    className="input-field"
                  >
                    {Object.entries(PRICING_UNIT_LABELS).map(([unit, label]) => (
                      <option key={unit} value={unit}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Stock Quantity (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editProductForm.stock_quantity}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    className="input-field"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={editProductForm.image_url}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editProductForm.description}
                    onChange={(e) => setEditProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editProductForm.available}
                      onChange={(e) => setEditProductForm(prev => ({ ...prev, available: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-earth-700">Product Available</span>
                  </label>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Update Product
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Vendor Section */}
          {state.editingVendor && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
              <h2 className="text-xl font-bold text-earth-800 mb-4">
                Edit Vendor: {state.editingVendor.name}
              </h2>
              <form onSubmit={handleUpdateVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    value={editVendorForm.name}
                    onChange={(e) => setEditVendorForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editVendorForm.contact_email}
                    onChange={(e) => setEditVendorForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editVendorForm.contact_phone}
                    onChange={(e) => setEditVendorForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Product Type
                  </label>
                  <select
                    value={editVendorForm.product_type}
                    onChange={(e) => setEditVendorForm(prev => ({ ...prev, product_type: e.target.value as ProductType }))}
                    className="input-field"
                  >
                    <option value="produce">Produce</option>
                    <option value="meat">Meat</option>
                    <option value="dairy">Dairy</option>
                    <option value="baked_goods">Baked Goods</option>
                    <option value="crafts">Crafts</option>
                    <option value="artisan_goods">Artisan Goods</option>
                    <option value="flowers">Flowers</option>
                    <option value="honey">Honey</option>
                    <option value="preserves">Preserves</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editVendorForm.payment_method || 'cash'}
                    onChange={(e) => setEditVendorForm(prev => ({ ...prev, payment_method: e.target.value as Vendor['payment_method'] }))}
                    className="input-field"
                  >
                    <option value="cash">Cash Only</option>
                    <option value="card">Card Only</option>
                    <option value="both">Cash & Card</option>
                    <option value="square">Square</option>
                    <option value="oauth">OAuth (Square/Stripe)</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Update Vendor
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelVendorEdit}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Vendor Section */}
          {showCreateVendor && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
              <h2 className="text-xl font-bold text-earth-800 mb-4">
                Create New Vendor
              </h2>
              <form onSubmit={handleCreateVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    value={newVendorForm.name}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newVendorForm.contact_email}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newVendorForm.contact_phone}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Product Type
                  </label>
                  <select
                    value={newVendorForm.product_type}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, product_type: e.target.value as ProductType }))}
                    className="input-field"
                  >
                    <option value="produce">Produce</option>
                    <option value="meat">Meat</option>
                    <option value="dairy">Dairy</option>
                    <option value="baked_goods">Baked Goods</option>
                    <option value="crafts">Crafts</option>
                    <option value="artisan_goods">Artisan Goods</option>
                    <option value="flowers">Flowers</option>
                    <option value="honey">Honey</option>
                    <option value="preserves">Preserves</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newVendorForm.payment_method || 'cash'}
                    onChange={(e) => setNewVendorForm(prev => ({ ...prev, payment_method: e.target.value as Vendor['payment_method'] }))}
                    className="input-field"
                  >
                    <option value="cash">Cash Only</option>
                    <option value="card">Card Only</option>
                    <option value="both">Cash & Card</option>
                    <option value="square">Square</option>
                    <option value="oauth">OAuth (Square/Stripe)</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    Create Vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateVendor(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Market Dates Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-800 mb-4">
              Market Dates
            </h2>
            
            {/* Add New Date Form */}
            <form onSubmit={handleAddMarketDate} className="mb-6 p-4 bg-earth-50 rounded-lg">
              <h3 className="font-semibold text-earth-800 mb-3">Add New Market Date</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDateForm.date}
                    onChange={(e) => setNewDateForm(prev => ({ ...prev, date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newDateForm.start_time}
                    onChange={(e) => setNewDateForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newDateForm.end_time}
                    onChange={(e) => setNewDateForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-earth-700 mb-1">
                    Weather Status
                  </label>
                  <select
                    value={newDateForm.weather_status}
                    onChange={(e) => setNewDateForm(prev => ({ ...prev, weather_status: e.target.value as any }))}
                    className="input-field"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-3 bg-market-600 text-white px-4 py-2 rounded-lg hover:bg-market-700"
              >
                Add Date
              </button>
            </form>

            {/* Existing Dates */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {state.marketDates
                .filter(date => new Date(date.date + 'T00:00:00') >= new Date(new Date().toDateString()))
                .sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime())
                .map((date) => (
                <div key={date.id} className="p-3 border border-earth-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium text-earth-800">
                        {new Date(date.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className={`text-sm capitalize ${
                        date.weather_status === 'scheduled' ? 'text-green-600' :
                        date.weather_status === 'cancelled' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {date.weather_status}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <select
                        value={date.weather_status}
                        onChange={(e) => handleUpdateMarketDate(date.id, e.target.value as any)}
                        className="text-sm border border-earth-300 rounded px-2 py-1"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <label className="text-earth-600">Start:</label>
                      <input
                        type="time"
                        value={date.start_time}
                        onChange={(e) => handleUpdateMarketDateTimes(date.id, e.target.value, date.end_time)}
                        className="text-sm border border-earth-300 rounded px-2 py-1 w-24"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-earth-600">End:</label>
                      <input
                        type="time"
                        value={date.end_time}
                        onChange={(e) => handleUpdateMarketDateTimes(date.id, date.start_time, e.target.value)}
                        className="text-sm border border-earth-300 rounded px-2 py-1 w-24"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 