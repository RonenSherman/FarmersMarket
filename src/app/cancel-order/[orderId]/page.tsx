'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { orderService } from '@/lib/database';
import { customerNotificationService } from '@/lib/customerNotifications';
import type { Order, Vendor } from '@/types';
import { PRICING_UNIT_LABELS } from '@/types';

export default function CancelOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = params.orderId as string;
  const token = searchParams.get('token');
  
  const [order, setOrder] = useState<(Order & { vendors: Vendor }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    console.log('📧 Cancel order page loaded');
    console.log('📧 Order ID:', orderId);
    console.log('📧 Token:', token ? 'Present' : 'Missing');
    console.log('📧 Current URL:', window.location.href);
    loadOrderAndValidateToken();
  }, [orderId, token]);

  const loadOrderAndValidateToken = async () => {
    if (!token) {
      setErrorMessage('Invalid cancellation link - no token provided');
      toast.error('Invalid cancellation link');
      setLoading(false);
      return;
    }

    if (!orderId) {
      setErrorMessage('Invalid cancellation link - no order ID provided');
      toast.error('Invalid cancellation link');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Validating cancellation token...');
      
      // Validate token
      const isValid = await customerNotificationService.verifyCancellationToken(orderId, token);
      console.log('🔐 Token validation result:', isValid);
      
      if (!isValid) {
        setErrorMessage('Invalid or expired cancellation link');
        toast.error('Invalid or expired cancellation link');
        setLoading(false);
        return;
      }

      setTokenValid(true);
      console.log('✅ Token validated successfully');

      // Load order details
      console.log('📦 Loading order details...');
      const orders = await orderService.getAll();
      const foundOrder = orders.find(o => o.id === orderId);
      
      if (!foundOrder) {
        setErrorMessage('Order not found in database');
        toast.error('Order not found');
        setLoading(false);
        return;
      }

      console.log('📦 Order found:', foundOrder.order_number, foundOrder.order_status);

      if (foundOrder.order_status === 'cancelled') {
        setErrorMessage('Order is already cancelled');
        setOrder(foundOrder); // Set order so UI can show cancelled state
        setLoading(false);
        return;
      }

      if (foundOrder.order_status === 'completed') {
        setErrorMessage('Cannot cancel completed order');
        toast.error('Cannot cancel completed order');
        setLoading(false);
        return;
      }

      if (foundOrder.order_status === 'ready') {
        setErrorMessage('Cannot cancel order that is ready for pickup');
        toast.error('Cannot cancel order that is ready for pickup');
        setLoading(false);
        return;
      }

      setOrder(foundOrder);
      console.log('✅ Order loaded successfully');
    } catch (error) {
      console.error('❌ Error loading order:', error);
      setErrorMessage(`Failed to load order details: ${error}`);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      await orderService.updateStatus(order.id, 'cancelled');
      
      // Mark the cancellation token as used
      if (token) {
        try {
          await customerNotificationService.markTokenAsUsed(order.id, token);
        } catch (error) {
          console.error('Failed to mark token as used:', error);
          // Don't fail the cancellation if token marking fails
        }
      }
      
      // Send cancellation confirmation
      if (order.notification_method) {
        try {
          const updatedOrder = { ...order, order_status: 'cancelled' as const };
          
          const notificationResponse = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order: updatedOrder,
              notificationMethod: order.notification_method,
              type: 'status_update'
            })
          });
          
          if (!notificationResponse.ok) {
            console.error('Failed to send cancellation notification');
          }
        } catch (error) {
          console.error('Failed to send cancellation notification:', error);
        }
      }

      toast.success('Order cancelled successfully');
      setOrder(prev => prev ? { ...prev, order_status: 'cancelled' } : null);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-market-600"></div>
          <p className="mt-4 text-earth-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid || !order) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-earth-800 mb-4">Invalid Link</h1>
          <p className="text-earth-600 mb-6">
            This cancellation link is invalid or has expired. Please contact the vendor directly if you need to cancel your order.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-market-600 text-white px-6 py-3 rounded-lg hover:bg-market-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Cancel Order</h1>
            <p className="text-red-100">Review your order details before cancelling</p>
          </div>

          <div className="p-6">
            {order.order_status === 'cancelled' ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold text-earth-800 mb-4">Order Already Cancelled</h2>
                <p className="text-earth-600 mb-6">This order has already been cancelled.</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-market-600 text-white px-6 py-3 rounded-lg hover:bg-market-700"
                >
                  Go to Home
                </button>
              </div>
            ) : (
              <>
                {/* Order Details */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-earth-800 mb-4">Order Details</h2>
                  
                  <div className="bg-earth-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-earth-700">Order Number:</span>
                        <p className="text-earth-900">{order.order_number}</p>
                      </div>
                      <div>
                        <span className="font-medium text-earth-700">Status:</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.order_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.order_status}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-earth-700">Vendor:</span>
                        <p className="text-earth-900">{order.vendors.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-earth-700">Total:</span>
                        <p className="text-earth-900 font-bold">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-earth-800">Items:</h3>
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-earth-50 rounded">
                        <div>
                          <h4 className="font-medium text-earth-800">{item.product.name}</h4>
                          <p className="text-sm text-earth-600">
                            ${item.product.price.toFixed(2)} per {PRICING_UNIT_LABELS[item.product.unit]}
                          </p>
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
                </div>

                {/* Cancellation Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="text-yellow-500 text-xl mr-3">⚠️</div>
                    <div>
                      <h3 className="font-medium text-yellow-800 mb-2">Before you cancel:</h3>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• This action cannot be undone</li>
                        <li>• You will receive a confirmation email/SMS</li>
                        <li>• The vendor will be notified of the cancellation</li>
                        <li>• Any payment will be refunded according to the vendor's policy</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-earth-200 text-earth-800 py-3 px-6 rounded-lg font-medium hover:bg-earth-300 transition-colors"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 