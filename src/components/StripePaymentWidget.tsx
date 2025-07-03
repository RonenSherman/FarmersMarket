'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface StripePaymentWidgetProps {
  vendorId: string;
  orderTotal: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export function StripePaymentWidget({ 
  vendorId, 
  orderTotal, 
  onPaymentSuccess, 
  onPaymentError 
}: StripePaymentWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [publishableKey, setPublishableKey] = useState<string>('');
  const cardElementRef = useRef<HTMLDivElement>(null);
  const cardElementInstance = useRef<any>(null);

  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        const response = await fetch('/api/oauth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, provider: 'stripe' })
        });

        if (!response.ok) {
          throw new Error('Failed to load Stripe configuration');
        }

        const config = await response.json();
        setPublishableKey(config.publishableKey);
        
        await initializeStripeSDK(config.publishableKey, config.accountId);
      } catch (error: any) {
        console.error('Error loading Stripe config:', error);
        onPaymentError('Failed to initialize payment system');
      }
    };

    loadStripeConfig();
  }, [vendorId, onPaymentError]);

  const initializeStripeSDK = async (pubKey: string, accountId: string) => {
    try {
      // Load Stripe SDK if not already loaded
      if (!window.Stripe) {
        await loadStripeScript();
      }

      const stripeInstance = window.Stripe(pubKey, {
        stripeAccount: accountId // For connected accounts
      });
      setStripe(stripeInstance);

      const elementsInstance = stripeInstance.elements();
      setElements(elementsInstance);

      // Create card element
      const cardElement = elementsInstance.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });

      cardElement.mount(cardElementRef.current);
      cardElementInstance.current = cardElement;

      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to initialize Stripe SDK:', error);
      onPaymentError('Failed to load payment form');
    }
  };

  const loadStripeScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe SDK'));
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!stripe || !elements || !cardElementInstance.current) {
      onPaymentError('Payment system not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElementInstance.current,
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      // Create payment intent with authorization only
      const authResponse = await fetch('/api/payments/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          vendorId,
          amount: Math.round(orderTotal * 100), // Convert to cents
          currency: 'usd',
          capture_method: 'manual' // This creates an authorization, not a capture
        })
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Payment authorization failed');
      }

      const authData = await authResponse.json();

      // Confirm payment intent if required
      if (authData.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(authData.client_secret);
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      onPaymentSuccess({
        provider: 'stripe',
        authorizationId: authData.payment_intent_id,
        status: 'authorized',
        amount: orderTotal,
        paymentMethodType: 'card'
      });

      toast.success('Payment authorized successfully!');

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
        <p className="text-center text-gray-500 mt-2">Loading Stripe payment form...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-4">
        <div 
          ref={cardElementRef}
          className="min-h-[50px]"
        />
      </div>
      
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

// Declare Stripe SDK types
declare global {
  interface Window {
    Stripe: any;
  }
} 