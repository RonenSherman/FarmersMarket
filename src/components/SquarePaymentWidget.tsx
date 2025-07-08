'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

// Square Payment Widget Component
// Note: Ensure you're testing with the correct vendor ID that has payment_connected: false
// CORRECTED vendor ID for testing: b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2
// Last updated: January 2025 - Fixed data mismatch issue

interface SquarePaymentWidgetProps {
  vendorId: string;
  orderTotal: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export function SquarePaymentWidget({ 
  vendorId, 
  orderTotal, 
  onPaymentSuccess, 
  onPaymentError 
}: SquarePaymentWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<any>(null);
  const cardRef2 = useRef<any>(null);

  useEffect(() => {
    const loadSquareConfig = async () => {
      try {
        console.log('🔍 [Square Widget] Loading config for vendorId:', vendorId);
        
        const response = await fetch('/api/oauth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, provider: 'square' })
        });

        console.log('🔍 [Square Widget] Config response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('🔍 [Square Widget] Config response error:', errorData);
          
          // Handle specific error messages
          if (errorData.error && errorData.error.includes('data inconsistency')) {
            throw new Error('Payment connection needs to be reset. Please contact support to reconnect your payment provider.');
          } else if (errorData.error && errorData.error.includes('exists but is not active')) {
            throw new Error('Payment connection expired. Please reconnect your payment provider.');
          } else if (errorData.error && errorData.error.includes('No payment connection')) {
            throw new Error('Payment provider not connected. Please set up payment processing first.');
          } else {
            throw new Error('Failed to load Square configuration');
          }
        }

        const config = await response.json();
        console.log('🔍 [Square Widget] Config received:', config);
        setApplicationId(config.applicationId);
        setLocationId(config.locationId);
        
        await initializeSquareSDK(config.applicationId, config.locationId);
      } catch (error: any) {
        console.error('Error loading Square config:', error);
        setError(error.message || 'Failed to initialize payment system');
        setIsLoading(false);
      }
    };

    loadSquareConfig();
  }, [vendorId, onPaymentError]);

  const initializeSquareSDK = async (appId: string, locId: string) => {
    try {
      // Load Square SDK if not already loaded
      if (!window.Square) {
        await loadSquareScript();
      }

      const payments = window.Square.payments(appId, locId);
      paymentsRef.current = payments;

      const card = await payments.card();
      await card.attach(cardRef.current);
      cardRef2.current = card;

      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to initialize Square SDK:', error);
      onPaymentError('Failed to load payment form');
    }
  };

  const loadSquareScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Square) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sandbox-web.squarecdn.com/v1/square.js'; // Use production URL for production
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!paymentsRef.current || !cardRef2.current) {
      onPaymentError('Payment system not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await cardRef2.current.tokenize();
      
      if (result.status === 'OK') {
        // Create payment authorization (not capture)
        const authResponse = await fetch('/api/payments/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: result.token,
            vendorId,
            amount: Math.round(orderTotal * 100), // Convert to cents
            currency: 'USD',
            autocomplete: false // This creates an authorization, not a capture
          })
        });

        if (!authResponse.ok) {
          const errorData = await authResponse.json();
          throw new Error(errorData.error || 'Payment authorization failed');
        }

        const authData = await authResponse.json();
        
        onPaymentSuccess({
          provider: 'square',
          authorizationId: authData.payment.id,
          status: 'authorized',
          amount: orderTotal,
          paymentMethodType: 'card'
        });

        toast.success('Payment authorized successfully!');
      } else {
        const errors = result.errors?.map((error: any) => error.message).join(', ') || 'Payment failed';
        onPaymentError(errors);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <p className="text-center text-gray-500 mt-2">Loading Square payment form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Payment System Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={cardRef}
        className="min-h-[200px] border border-gray-300 rounded-lg p-4"
        style={{ minHeight: '200px' }}
      />
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          💳 <strong>Payment Authorization:</strong> Your card will be authorized for ${orderTotal.toFixed(2)} 
          but not charged until your order is confirmed by the vendor.
        </p>
      </div>

      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isProcessing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Authorizing Payment...
          </span>
        ) : (
          `Authorize Payment - $${orderTotal.toFixed(2)}`
        )}
      </button>
    </div>
  );
}

// Declare Square SDK types
declare global {
  interface Window {
    Square: any;
  }
} 