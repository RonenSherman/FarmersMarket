'use client';

import { useState, useEffect } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { formatCurrency } from '@/lib/utils';
import { MinusIcon, PlusIcon, TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { PRICING_UNIT_LABELS, PricingUnit } from '@/types';

export default function CartPage() {
  const { carts, updateCartQuantity, removeFromCart, clearCart } = useMarketStore();
  const [checkoutVendor, setCheckoutVendor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log('Cart page mounted, carts:', carts);
      console.log('Carts length:', carts.length);
      carts.forEach((cart, index) => {
        console.log(`Cart ${index}:`, {
          vendor_id: cart.vendor_id,
          vendor_name: cart.vendor_name,
          items: cart.items.length,
          total: cart.total
        });
      });
    }
  }, [carts, mounted]);

  const handleQuantityChange = (vendorId: string, productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(vendorId, productId);
      return;
    }
    
    try {
      updateCartQuantity(vendorId, productId, newQuantity);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('available')) {
          toast.error(`📦 ${error.message}`);
        } else {
          toast.error(`⚠️ ${error.message}`);
        }
      } else {
        toast.error('Unable to update quantity');
      }
    }
  };

  const handleCheckout = async (vendorId: string, vendorName: string) => {
    setCheckoutVendor(vendorId);
    
    // Simulate order processing
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Order placed with ${vendorName}! Please wait for confirmation.`);
      clearCart(vendorId);
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setCheckoutVendor(null);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (carts.length === 0) {
    return (
          <div className="min-h-screen bg-earth-50 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
          <ShoppingBagIcon className="h-16 sm:h-24 w-16 sm:w-24 text-earth-300 mx-auto mb-4 sm:mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold text-earth-800 mb-3 sm:mb-4">Your Cart is Empty</h1>
          <p className="text-base sm:text-lg text-earth-600 mb-6 sm:mb-8">
              Start shopping to add items to your cart
            </p>
          <Link href="/shop" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3">
                              Browse Online Market
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-6 sm:py-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-earth-800 mb-6 sm:mb-8">Your Cart</h1>
        
        <div className="space-y-8">
          {carts.map((cart) => (
            <div key={cart.vendor_id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              {/* Vendor Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 pb-4 border-b border-earth-200 space-y-2 sm:space-y-0">
                <h2 className="text-2xl font-semibold text-earth-800">
                  {cart.vendor_name}
                </h2>
                <div className="text-right">
                  <p className="text-sm text-earth-600">Total</p>
                  <p className="text-2xl font-bold text-market-600">
                    {formatCurrency(cart.total)}
                  </p>
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                                  <div key={item.product.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-earth-100 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-earth-800">{item.product.name}</h3>
                    <p className="text-sm text-earth-600 hidden sm:block">{item.product.description}</p>
                    <p className="text-base sm:text-lg font-medium text-market-600 mt-1">
                        {formatCurrency(item.product.price)} per {PRICING_UNIT_LABELS[item.product.unit as PricingUnit]}
                      </p>
                    </div>
                    
                  <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(cart.vendor_id, item.product.id, item.quantity - 1)}
                          className="p-1 rounded-full bg-earth-100 hover:bg-earth-200 transition-colors"
                        >
                          <MinusIcon className="h-4 w-4 text-earth-600" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(cart.vendor_id, item.product.id, item.quantity + 1)}
                          className="p-1 rounded-full bg-earth-100 hover:bg-earth-200 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4 text-earth-600" />
                        </button>
                      </div>
                      
                      {/* Item Total */}
                      <div className="w-20 text-right">
                        <p className="font-semibold text-earth-800">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(cart.vendor_id, item.product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 space-y-3 sm:space-y-0">
                <div className="text-sm text-earth-600">
                  <p>Payment will be processed directly with {cart.vendor_name}</p>
                  <p className="hidden sm:block">Complete your order details and pickup information</p>
                </div>
                <Link
                  href={`/checkout/${cart.vendor_id}`}
                  className="btn-primary px-6 sm:px-8 py-2 sm:py-3 inline-block text-center w-full sm:w-auto text-sm sm:text-base"
                >
                  Checkout {formatCurrency(cart.total)}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Order Information */}
        <div className="mt-12 bg-market-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-earth-800 mb-4">Order Information</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-earth-600">
            <div>
              <h4 className="font-medium text-earth-800 mb-2">Pickup Instructions</h4>
              <ul className="space-y-1">
                <li>• Orders will be ready for pickup at the Duvall Farmers Market</li>
                <li>• Bring your order confirmation</li>
                <li>• Visit each vendor's booth separately</li>
                <li>• Payment is processed at pickup</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-earth-800 mb-2">Order Validation</h4>
              <ul className="space-y-1">
                <li>• Orders are validated for availability</li>
                <li>• You'll receive confirmation within minutes</li>
                <li>• Any issues will be communicated promptly</li>
                <li>• Substitutions may be offered if needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 