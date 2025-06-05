'use client';

import { useState } from 'react';
import { useMarketStore } from '@/store/marketStore';
import { formatCurrency } from '@/lib/utils';
import { MinusIcon, PlusIcon, TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function CartPage() {
  const { carts, updateCartQuantity, removeFromCart, clearCart } = useMarketStore();
  const [checkoutVendor, setCheckoutVendor] = useState<string | null>(null);

  const handleQuantityChange = (vendorId: string, productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(vendorId, productId);
    } else {
      updateCartQuantity(vendorId, productId, newQuantity);
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

  if (carts.length === 0) {
    return (
      <div className="min-h-screen bg-earth-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBagIcon className="h-24 w-24 text-earth-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-earth-800 mb-4">Your Cart is Empty</h1>
            <p className="text-lg text-earth-600 mb-8">
              Start shopping to add items to your cart
            </p>
            <Link href="/" className="btn-primary text-lg px-8 py-3">
              Browse Market
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-earth-800 mb-8">Your Cart</h1>
        
        <div className="space-y-8">
          {carts.map((cart) => (
            <div key={cart.vendor_id} className="bg-white rounded-lg shadow-md p-6">
              {/* Vendor Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-earth-200">
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
                  <div key={item.product.id} className="flex items-center justify-between py-4 border-b border-earth-100">
                    <div className="flex-1">
                      <h3 className="font-semibold text-earth-800">{item.product.name}</h3>
                      <p className="text-sm text-earth-600">{item.product.description}</p>
                      <p className="text-lg font-medium text-market-600 mt-1">
                        {formatCurrency(item.product.price)} each
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
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
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-earth-600">
                  <p>Payment will be processed directly with {cart.vendor_name}</p>
                  <p>You'll receive order confirmation shortly</p>
                </div>
                <button
                  onClick={() => handleCheckout(cart.vendor_id, cart.vendor_name)}
                  disabled={checkoutVendor === cart.vendor_id}
                  className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutVendor === cart.vendor_id ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Checkout ${formatCurrency(cart.total)}`
                  )}
                </button>
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
                <li>• Orders will be ready for pickup at the market</li>
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