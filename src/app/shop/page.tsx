'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { vendorService, productService } from '@/lib/database';
import { useMarketStore } from '@/store/marketStore';
import type { Vendor, Product, VendorCart } from '@/types';

export default function ShopPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  const { addToCart, carts } = useMarketStore();

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
    loadShopData();
  }, []);

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
    return categoryMatch && vendorMatch;
  });

  const handleAddToCart = (product: Product) => {
    const vendor = vendors.find(v => v.id === product.vendor_id);
    if (!vendor) {
      toast.error('Vendor not found');
      return;
    }

    addToCart(product.vendor_id, vendor.name, product, 1);
    toast.success(`Added ${product.name} to cart`);
  };

  const getProductQuantityInCart = (productId: string, vendorId: string) => {
    const vendorCart = carts.find((c: VendorCart) => c.vendor_id === vendorId);
    const item = vendorCart?.items.find((item: any) => item.product.id === productId);
    return item?.quantity || 0;
  };

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
    <div className="min-h-screen bg-earth-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-earth-800 mb-4">
            Shop Local Products
          </h1>
          <p className="text-lg text-earth-600">
            Fresh, local products from our amazing vendors
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-earth-600">No products found</p>
            <p className="text-earth-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const vendor = vendors.find(v => v.id === product.vendor_id);
              const quantityInCart = getProductQuantityInCart(product.id, product.vendor_id);

              return (
                <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
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
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold text-earth-800 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-earth-600">
                        by {vendor?.name}
                      </p>
                    </div>

                    {product.description && (
                      <p className="text-sm text-earth-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-market-600">
                        ${product.price.toFixed(2)}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        {quantityInCart > 0 && (
                          <span className="bg-market-100 text-market-800 text-sm font-medium px-2 py-1 rounded-full">
                            {quantityInCart} in cart
                          </span>
                        )}
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="bg-market-600 text-white px-4 py-2 rounded-lg hover:bg-market-700 transition-colors text-sm font-medium"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>

                    {/* Stock Info */}
                    {product.stock_quantity !== undefined && (
                      <div className="mt-2">
                        <p className={`text-xs ${
                          product.stock_quantity > 10 ? 'text-green-600' :
                          product.stock_quantity > 0 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {product.stock_quantity > 0 
                            ? `${product.stock_quantity} available`
                            : 'Out of stock'
                          }
                        </p>
                      </div>
                    )}
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