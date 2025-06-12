'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useMarketStore } from '@/store/marketStore';
import { vendorService, orderService } from '@/lib/database';
import { notificationService } from '@/lib/notifications';
import { customerNotificationService } from '@/lib/customerNotifications';
import type { Vendor, VendorCart } from '@/types';
import { PRICING_UNIT_LABELS } from '@/types';

export default function VendorCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorCart, setVendorCart] = useState<VendorCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    phone: '',
    name: '',
    delivery_address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      delivery_instructions: ''
    },
    special_instructions: '',
    notification_method: 'email' as 'email'
  });

  const { carts, clearCart } = useMarketStore();

  useEffect(() => {
    loadCheckoutData();
  }, [vendorId]);

  const loadCheckoutData = async () => {
    try {
      const vendorData = await vendorService.getById(vendorId);
      const cart = carts.find(c => c.vendor_id === vendorId);
      
      if (!cart || cart.items.length === 0) {
        toast.error('No items in cart for this vendor');
        router.push('/shop');
        return;
      }

      setVendor(vendorData);
      setVendorCart(cart);
    } catch (error) {
      console.error('Error loading checkout data:', error);
      toast.error('Failed to load checkout information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !vendorCart) return;

    setSubmitting(true);
    try {
      const orderNumber = `ORD-${Date.now()}`;
      
      // Combine delivery address and special instructions
      const deliveryInfo = `DELIVERY ADDRESS:
${customerInfo.delivery_address.street}
${customerInfo.delivery_address.city}, ${customerInfo.delivery_address.state} ${customerInfo.delivery_address.zip_code}
${customerInfo.delivery_address.delivery_instructions ? `Instructions: ${customerInfo.delivery_address.delivery_instructions}` : ''}

${customerInfo.special_instructions ? `SPECIAL INSTRUCTIONS: ${customerInfo.special_instructions}` : ''}`.trim();

      const newOrder = await orderService.create({
        vendor_id: vendorId,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_name: customerInfo.name,
        items: vendorCart.items,
        subtotal: vendorCart.total,
        tax: 0, // Calculate tax if needed
        total: vendorCart.total,
        payment_method: 'card',
        payment_status: 'pending',
        order_status: 'pending',
        order_date: new Date().toISOString().split('T')[0],
        order_number: orderNumber,
        special_instructions: deliveryInfo
        // notification_method: customerInfo.notification_method // Temporarily commented until DB updated
      });

      // Send admin notification
      await notificationService.sendNewOrderNotification({
        orderNumber,
        customerName: customerInfo.name,
        vendorName: vendor.name,
        total: vendorCart.total
      });

      // Send customer confirmation email/SMS
      try {
        console.log('📧 Sending email confirmation to:', customerInfo.email);
        await customerNotificationService.sendOrderConfirmation(
          { ...newOrder, vendors: vendor },
          customerInfo.notification_method
        );
        
        // Different success messages based on environment
        if (process.env.SENDGRID_API_KEY) {
          toast.success('Order placed and confirmation email sent!');
        } else {
          toast.success('Order placed! (Check console for email notification details)');
        }
      } catch (error) {
        console.error('Failed to send customer notification:', error);
        toast.success('Order placed successfully!');
      }

      clearCart(vendorId);
      router.push(`/order-confirmation/${vendorId}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-market-600"></div>
          <p className="mt-4 text-earth-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!vendor || !vendorCart) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-earth-800 mb-4">Cart Empty</h1>
          <p className="text-earth-600 mb-6">No items found for this vendor</p>
          <button
            onClick={() => router.push('/shop')}
            className="bg-market-600 text-white px-6 py-3 rounded-lg hover:bg-market-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-market-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Checkout - {vendor.name}</h1>
            <p className="text-market-100">Complete your order</p>
          </div>

          <div className="p-6 grid lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div>
              <h2 className="text-xl font-bold text-earth-800 mb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {vendorCart.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center p-4 bg-earth-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {item.product.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-medium text-earth-800">{item.product.name}</h3>
                        <p className="text-sm text-earth-600">${item.product.price.toFixed(2)} per {PRICING_UNIT_LABELS[item.product.unit]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-earth-800">Qty: {item.quantity}</p>
                      <p className="text-market-600 font-bold">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-earth-200 pt-4">
                <div className="flex justify-between items-center text-xl font-bold text-earth-800">
                  <span>Total:</span>
                  <span className="text-market-600">${vendorCart.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="mt-6 p-4 bg-market-50 rounded-lg">
                <h3 className="font-semibold text-market-800 mb-2">Vendor Information</h3>
                <p className="text-sm text-market-700">📧 {vendor.contact_email}</p>
                <p className="text-sm text-market-700">📞 {vendor.contact_phone}</p>
                <p className="text-sm text-market-700">💳 Uses: {vendor.payment_method} payment system</p>
              </div>
            </div>

            {/* Customer Information Form */}
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              <h2 className="text-xl font-bold text-earth-800">Your Information</h2>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-earth-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-earth-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-earth-700 mb-2">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-field"
                  placeholder="For vendor contact purposes only"
                />
              </div>

              {/* Delivery Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-earth-800">Delivery Information</h3>
                <p className="text-sm text-earth-600">We deliver fresh products to your door during market hours (Thursday 3:00-6:30 PM)</p>
                
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-earth-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={customerInfo.delivery_address.street}
                    onChange={(e) => setCustomerInfo(prev => ({ 
                      ...prev, 
                      delivery_address: { ...prev.delivery_address, street: e.target.value }
                    }))}
                    className="input-field"
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-earth-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={customerInfo.delivery_address.city}
                      onChange={(e) => setCustomerInfo(prev => ({ 
                        ...prev, 
                        delivery_address: { ...prev.delivery_address, city: e.target.value }
                      }))}
                      className="input-field"
                      placeholder="Duvall"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-earth-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={customerInfo.delivery_address.state}
                      onChange={(e) => setCustomerInfo(prev => ({ 
                        ...prev, 
                        delivery_address: { ...prev.delivery_address, state: e.target.value }
                      }))}
                      className="input-field"
                      placeholder="WA"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-earth-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    value={customerInfo.delivery_address.zip_code}
                    onChange={(e) => setCustomerInfo(prev => ({ 
                      ...prev, 
                      delivery_address: { ...prev.delivery_address, zip_code: e.target.value }
                    }))}
                    className="input-field"
                    placeholder="98019"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="delivery_instructions" className="block text-sm font-medium text-earth-700 mb-2">
                    Delivery Instructions
                  </label>
                  <textarea
                    id="delivery_instructions"
                    value={customerInfo.delivery_address.delivery_instructions}
                    onChange={(e) => setCustomerInfo(prev => ({ 
                      ...prev, 
                      delivery_address: { ...prev.delivery_address, delivery_instructions: e.target.value }
                    }))}
                    className="input-field"
                    rows={3}
                    placeholder="Leave at front door, ring doorbell, etc."
                  />
                </div>
              </div>



              <div>
                <label htmlFor="special_instructions" className="block text-sm font-medium text-earth-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  id="special_instructions"
                  value={customerInfo.special_instructions}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, special_instructions: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Any special requests or notes for the vendor..."
                />
              </div>

              {/* Email Notifications Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-earth-800 mb-2">📧 Email Updates</h3>
                <p className="text-sm text-blue-700">
                  We'll send you email updates when your order is confirmed, ready for pickup, and completed. 
                  You can also cancel your order directly from the notification email.
                </p>
              </div>

              {/* Payment Method Info */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">💳 Payment Information</h3>
                <p className="text-sm text-green-700">
                  Payment Method: <strong>Credit/Debit Card Only</strong>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Vendor uses: <strong className="uppercase">{vendor.payment_method}</strong> payment system
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your card will be charged when the order is confirmed for delivery.
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="flex-1 bg-earth-200 text-earth-800 py-3 px-6 rounded-lg font-medium hover:bg-earth-300 transition-colors"
                >
                  Back to Cart
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-market-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-market-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 