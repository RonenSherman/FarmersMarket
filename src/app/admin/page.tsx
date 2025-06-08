'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { vendorService, productService, marketDateService, orderService } from '@/lib/database';
import PhotoUpload from '@/components/PhotoUpload';
import type { Vendor, Product, MarketDate, Order } from '@/types';

interface AdminState {
  isAuthenticated: boolean;
  vendors: Vendor[];
  products: Product[];
  marketDates: MarketDate[];
  orders: (Order & { vendors: Vendor })[];
  selectedVendor: Vendor | null;
  loading: boolean;
  newOrdersCount: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [state, setState] = useState<AdminState>({
    isAuthenticated: false,
    vendors: [],
    products: [],
    marketDates: [],
    orders: [],
    selectedVendor: null,
    loading: false,
    newOrdersCount: 0
  });

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: 'produce' as const,
    image_url: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const [newDateForm, setNewDateForm] = useState({
    date: '',
    weather_status: 'scheduled' as const
  });

  // Admin password - in production, this should be environment variable
  const ADMIN_PASSWORD = 'farmersmarket2024';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setState(prev => ({ ...prev, isAuthenticated: true }));
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
        unit: 'each',
        available: true
      });

      toast.success('Product added successfully');
      setNewProductForm({
        name: '',
        price: '',
        description: '',
        category: 'produce',
        image_url: ''
      });
      setSelectedPhoto(null);
      loadAdminData();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleAddMarketDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await marketDateService.create({
        date: newDateForm.date,
        is_active: newDateForm.weather_status === 'scheduled',
        start_time: '15:00:00', // 3:00 PM
        end_time: '18:30:00',   // 6:30 PM
        weather_status: newDateForm.weather_status,
        is_special_event: false,
        notes: undefined
      });

      toast.success('Market date added successfully');
      setNewDateForm({
        date: '',
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

  const handleUpdateOrderStatus = async (orderId: string, order_status: Order['order_status']) => {
    try {
      await orderService.updateStatus(orderId, order_status);
      toast.success('Order status updated successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
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
    <div className="min-h-screen bg-earth-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-earth-800">Admin Dashboard</h1>
            {state.newOrdersCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                {state.newOrdersCount} New Order{state.newOrdersCount > 1 ? 's' : ''}!
              </div>
            )}
          </div>
          <button
            onClick={() => setState(prev => ({ ...prev, isAuthenticated: false }))}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
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
                      <p className="text-sm text-earth-600">🏪 {order.vendors.name}</p>
                      <p className="text-sm text-earth-600">💰 ${order.total.toFixed(2)}</p>
                      <p className="text-sm text-earth-600">📍 {order.delivery_address.street}, {order.delivery_address.city}</p>
                      <p className="text-sm text-earth-500">📅 {new Date(order.created_at).toLocaleDateString()}</p>
                      {order.special_instructions && (
                        <p className="text-sm text-earth-600 mt-1">📝 {order.special_instructions}</p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <select
                        value={order.order_status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as Order['order_status'])}
                        className="text-xs border border-earth-300 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Vendors Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-800 mb-4">
              Vendors ({state.vendors.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {state.vendors.map((vendor) => (
                <div key={vendor.id} className="border border-earth-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-earth-800">{vendor.name}</h3>
                      <p className="text-sm text-earth-600">{vendor.contact_email}</p>
                      <p className="text-sm text-earth-600">{vendor.contact_phone}</p>
                      <p className="text-sm text-earth-600 capitalize">{vendor.product_type}</p>
                      <p className="text-sm text-earth-600">Payment: {vendor.payment_method}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setState(prev => ({ ...prev, selectedVendor: vendor }))}
                        className="bg-market-600 text-white px-3 py-1 rounded text-sm hover:bg-market-700"
                      >
                        Add Product
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
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
                  <label className="block text-sm font-medium text-earth-700 mb-3">
                    Product Photo
                  </label>
                  <PhotoUpload
                    onPhotoSelected={setSelectedPhoto}
                    currentImageUrl={newProductForm.image_url}
                  />
                  
                  <div className="mt-4">
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
                        <p className="text-sm text-earth-600">${product.price.toFixed(2)}</p>
                        <p className="text-sm text-earth-600 capitalize">{product.category}</p>
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded mt-2"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Dates Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-800 mb-4">
              Market Dates
            </h2>
            
            {/* Add New Date Form */}
            <form onSubmit={handleAddMarketDate} className="mb-6 p-4 bg-earth-50 rounded-lg">
              <h3 className="font-semibold text-earth-800 mb-3">Add New Market Date</h3>
              <div className="grid grid-cols-2 gap-4">
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
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((date) => (
                <div key={date.id} className="flex justify-between items-center p-3 border border-earth-200 rounded-lg">
                  <div>
                    <p className="font-medium text-earth-800">
                      {new Date(date.date).toLocaleDateString('en-US', {
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 