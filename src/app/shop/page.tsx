'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { vendorService, productService, marketDateService } from '@/lib/database';
import { useMarketStore } from '@/store/marketStore';
import { MinusIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Vendor, Product, VendorCart, PricingUnit, MarketDate } from '@/types';
import { PRICING_UNIT_LABELS } from '@/types';
import { isMarketOpen, getNextMarketDate, formatMarketDate, isMarketOpenOnDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function ShopPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketOpen, setMarketOpen] = useState(true);
  const [todayMarket, setTodayMarket] = useState<MarketDate | null>(null);
  const router = useRouter();

  const { addToCart, carts, products, setProducts, getAvailableStock, removeFromCart, updateCartQuantity } = useMarketStore();

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'produce', label: 'Produce' },
    { value: 'baked_goods', label: 'Baked Goods' },
    { value: 'crafts', label: 'Crafts' },
    { value: 'artisan_goods', label: 'Artisan Goods' },
    { value: 'flowers', label: 'Flowers' },
    { value: 'honey', label: 'Honey' },
    { value: 'preserves', label: 'Preserves' },
    { value: 'meat', label: 'Meat' },
    { value: 'dairy', label: 'Dairy' }
  ];

  useEffect(() => {
    checkMarketStatus();
  }, []);

  const checkMarketStatus = async () => {
    try {
      // Get today's market date from database
      const todayMarketDate = await marketDateService.getToday();
      console.log('Shop page - Today market date from DB:', todayMarketDate);
      setTodayMarket(todayMarketDate);

      if (todayMarketDate && todayMarketDate.is_active) {
        // Check if the market is cancelled due to weather
        if (todayMarketDate.weather_status === 'cancelled') {
          console.log('Shop page - Market cancelled due to weather');
          setMarketOpen(false);
          toast.error('Today\'s market has been cancelled due to weather. Check the calendar for updates.');
          setTimeout(() => {
            router.replace('/calendar');
          }, 3500);
          return;
        }

        // Use the actual market times from the database
        const open = isMarketOpenOnDate(todayMarketDate.date, todayMarketDate.start_time, todayMarketDate.end_time);
        console.log('Shop page - Market open check:', open, 'Date:', todayMarketDate.date, 'Times:', todayMarketDate.start_time, '-', todayMarketDate.end_time);
        setMarketOpen(open);
        
        if (!open) {
          toast.error('The market is currently closed. Redirecting to calendar...');
          setTimeout(() => {
            router.replace('/calendar');
          }, 3500);
        } else {
          loadShopData();
        }
      } else {
        // No active market date found - check if today should be a market day using fallback logic
        console.log('Shop page - No active market date found, using fallback logic');
        const open = isMarketOpen();
        console.log('Shop page - Using fallback logic, market open:', open);
        setMarketOpen(open);
        
        if (!open) {
          toast.error('The market is currently closed. Redirecting to calendar...');
          setTimeout(() => {
            router.replace('/calendar');
          }, 3500);
        } else {
          loadShopData();
        }
      }
    } catch (error) {
      console.error('Error checking market status:', error);
      // Fallback to default logic
      const open = isMarketOpen();
      setMarketOpen(open);
      
      if (!open) {
        toast.error('The market is currently closed. Redirecting to calendar...');
        setTimeout(() => {
          router.replace('/calendar');
        }, 3500);
      } else {
        loadShopData();
      }
    }
  };

  const loadShopData = async () => {
    try {
      const [vendorsData, productsData] = await Promise.all([
        vendorService.getAll(),
        productService.getAll()
      ]);
      
      setVendors(vendorsData);
      setProducts(productsData.filter(p => p.available));
      setLoading(false);
    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('Failed to load products');
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const vendorMatch = selectedVendor === 'all' || product.vendor_id === selectedVendor;
    
    // Search functionality
    const searchLower = searchQuery.toLowerCase();
    const vendor = vendors.find(v => v.id === product.vendor_id);
    const searchMatch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchLower) ||
      (product.description && product.description.toLowerCase().includes(searchLower)) ||
      (vendor && vendor.name.toLowerCase().includes(searchLower));
    
    return categoryMatch && vendorMatch && searchMatch;
  });

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    const vendor = vendors.find(v => v.id === product.vendor_id);
    if (!vendor) {
      toast.error('Vendor not found');
      return;
    }

    try {
      addToCart(product.vendor_id, vendor.name, product, quantity);
      toast.success(`✅ Added ${quantity} ${PRICING_UNIT_LABELS[product.unit]} of ${product.name} to cart`);
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('out of stock')) {
          toast.error(`😞 ${product.name} is out of stock`);
        } else if (error.message.includes('available')) {
          toast.error(`📦 ${error.message}`);
        } else if (error.message.includes('no longer available')) {
          toast.error(`❌ ${product.name} is no longer available`);
        } else {
          toast.error(`⚠️ ${error.message}`);
        }
      } else {
        toast.error('Unable to add item to cart');
      }
    }
  };

  const handleQuantityChange = (product: Product, change: number) => {
    const currentQuantity = getProductQuantityInCart(product.id, product.vendor_id);
    const newQuantity = currentQuantity + change;
    
    if (newQuantity <= 0) {
      // Remove from cart
      if (currentQuantity > 0) {
        removeFromCart(product.vendor_id, product.id);
        toast.success(`🗑️ Removed ${product.name} from cart`);
      }
      return;
    }
    
    try {
      if (currentQuantity === 0) {
        // Add to cart
        handleAddToCart(product, newQuantity);
      } else {
        // Update quantity
        updateCartQuantity(product.vendor_id, product.id, newQuantity);
        toast.success(`📦 Updated ${product.name} quantity to ${newQuantity}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`⚠️ ${error.message}`);
      } else {
        toast.error('Unable to update quantity');
      }
    }
  };

  const getProductQuantityInCart = (productId: string, vendorId: string) => {
    const vendorCart = carts.find((c: VendorCart) => c.vendor_id === vendorId);
    const item = vendorCart?.items.find((item: any) => item.product.id === productId);
    return item?.quantity || 0;
  };

  if (!marketOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-earth-800 mb-4">Market Closed</h2>
          <p className="text-lg text-earth-700 mb-2">
            The market is currently closed. Please come back at the next market date!
          </p>
          <p className="text-earth-600 mb-4">
            Next market: <strong>{formatMarketDate(getNextMarketDate())}</strong>
          </p>
          <p className="text-market-600">Redirecting you to the calendar...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-market-600"></div>
          <p className="mt-4 text-earth-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-earth-800 mb-2 sm:mb-4">
            Shop Local Products
          </h1>
          <p className="text-base sm:text-lg text-earth-600">
            Fresh, local products from our amazing vendors
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-2">
                Filter by Vendor
              </label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="input-field"
              >
                <option value="all">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, description, or vendor..."
                  className="input-field pl-10"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-earth-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-earth-600">No products found</p>
            <p className="text-earth-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const vendor = vendors.find(v => v.id === product.vendor_id);
              const quantityInCart = getProductQuantityInCart(product.id, product.vendor_id);
              const availableStock = getAvailableStock(product.id);

              return (
                <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow flex flex-col h-full">
                  {/* Product Image */}
                  <div className="h-48 bg-earth-100 relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${product.image_url ? 'hidden' : ''} flex items-center justify-center h-full`}>
                      <div className="text-center">
                        <div className="text-4xl text-earth-400 mb-2">📦</div>
                        <p className="text-earth-500 text-sm">No image available</p>
                      </div>
                    </div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-market-100 text-market-800 text-xs font-medium px-2 py-1 rounded-full capitalize">
                        {product.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3 sm:p-4 flex flex-col h-full">
                    {/* Product Header - Fixed Height */}
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold text-earth-800 mb-1 line-clamp-2 min-h-[3.5rem]">
                        {product.name}
                      </h3>
                      <p className="text-sm text-earth-600">
                        by {vendor?.name}
                      </p>
                    </div>

                    {/* Description - Fixed Height */}
                    <div className="mb-3 min-h-[3rem]">
                      {product.description && (
                        <p className="text-sm text-earth-600 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Price and Cart Info */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xl font-bold text-market-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-earth-600 ml-1">
                            per {PRICING_UNIT_LABELS[product.unit]}
                          </span>
                        </div>
                        
                        {quantityInCart > 0 && (
                          <span className="bg-market-100 text-market-800 text-sm font-medium px-2 py-1 rounded-full">
                            {quantityInCart} in cart
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Spacer to push controls to bottom */}
                    <div className="flex-grow"></div>
                    
                    {/* Controls Section - Fixed Height */}
                    <div className="min-h-[3rem] flex flex-col justify-end">
                      {/* Quantity Controls or Add Button */}
                      {quantityInCart > 0 ? (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleQuantityChange(product, -1)}
                              className="p-2 rounded-full bg-earth-100 hover:bg-earth-200 transition-colors"
                            >
                              <MinusIcon className="h-4 w-4 text-earth-600" />
                            </button>
                            <span className="font-medium text-earth-800 min-w-[2rem] text-center">
                              {quantityInCart}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(product, 1)}
                              disabled={product.stock_quantity !== undefined && availableStock <= 0}
                              className="p-2 rounded-full bg-earth-100 hover:bg-earth-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <PlusIcon className="h-4 w-4 text-earth-600" />
                            </button>
                          </div>
                          <span className="text-sm font-medium text-market-600">
                            ${(product.price * quantityInCart).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock_quantity !== undefined && availableStock <= 0}
                          className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium mb-2 ${
                            product.stock_quantity !== undefined && availableStock <= 0
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-market-600 text-white hover:bg-market-700'
                          }`}
                        >
                          {product.stock_quantity !== undefined && availableStock <= 0 
                            ? '🚫 Out of Stock' 
                            : '🛒 Add to Cart'
                          }
                        </button>
                      )}

                      {/* Stock Info - Fixed Height */}
                      <div className="min-h-[1.5rem]">
                        {product.stock_quantity !== undefined && (
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            availableStock > 10 ? 'bg-green-100 text-green-800' :
                            availableStock > 5 ? 'bg-yellow-100 text-yellow-800' :
                            availableStock > 0 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {availableStock > 0 ? (
                              <>
                                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                  availableStock > 10 ? 'bg-green-500' :
                                  availableStock > 5 ? 'bg-yellow-500' :
                                  'bg-orange-500'
                                }`}></span>
                                {availableStock} left
                              </>
                            ) : (
                              <>
                                <span className="inline-block w-2 h-2 rounded-full mr-1 bg-red-500"></span>
                                Out of stock
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 