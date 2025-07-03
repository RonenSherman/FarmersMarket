'use client';

import { useState, useEffect } from 'react';
import { SquarePaymentWidget } from './SquarePaymentWidget';
import { StripePaymentWidget } from './StripePaymentWidget';
import type { Vendor } from '@/types';

interface PaymentWidgetProps {
  vendor: Vendor;
  orderTotal: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export default function PaymentWidget({ vendor, orderTotal, onPaymentSuccess, onPaymentError }: PaymentWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<'square' | 'stripe' | null>(null);

  useEffect(() => {
    // Check if vendor has a payment provider connected
    if (vendor.payment_connected && vendor.payment_provider) {
      setPaymentProvider(vendor.payment_provider);
    } else {
      onPaymentError('Vendor has not connected a payment provider');
    }
    setLoading(false);
  }, [vendor, onPaymentError]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!paymentProvider) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-red-800">Payment Not Available</h3>
            <p className="text-sm text-red-700">
              This vendor has not connected a payment provider. Please contact them directly to arrange payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Payment Information
      </h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Amount:</span>
          <span className="font-semibold text-lg text-gray-800">${orderTotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Your payment will be authorized now and charged when your order is confirmed.
        </p>
      </div>

      {paymentProvider === 'square' && (
        <SquarePaymentWidget
          vendorId={vendor.id}
          orderTotal={orderTotal}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      )}

      {paymentProvider === 'stripe' && (
        <StripePaymentWidget
          vendorId={vendor.id}
          orderTotal={orderTotal}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      )}
    </div>
  );
} 