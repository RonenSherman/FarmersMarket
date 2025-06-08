'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId as string;

  useEffect(() => {
    // Auto-redirect to home after 10 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-earth-50 py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-earth-800 mb-4">
            Order Placed Successfully! 🎉
          </h1>
          
          <p className="text-lg text-earth-600 mb-6">
            Thank you for your order! We've received your request and the vendor will be notified immediately.
          </p>

          {/* Order Details */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-green-800 mb-4">What happens next?</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <span className="text-green-600">✅</span>
                <span className="text-earth-700">Your order has been sent to the vendor</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-600">📧</span>
                <span className="text-earth-700">You'll receive a confirmation email shortly</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-600">💳</span>
                <span className="text-earth-700">Payment will be processed when your order is confirmed</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-600">🚚</span>
                <span className="text-earth-700">Delivery will be arranged according to your preferences</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-600">📱</span>
                <span className="text-earth-700">You'll be contacted with delivery updates</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link
              href="/shop"
              className="w-full bg-market-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-market-700 transition-colors inline-block"
            >
              Continue Shopping
            </Link>
            
            <Link
              href="/"
              className="w-full bg-earth-200 text-earth-800 py-3 px-6 rounded-lg font-medium hover:bg-earth-300 transition-colors inline-block"
            >
              Return to Home
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="text-sm text-earth-500 mt-6">
            You'll be automatically redirected to the home page in 10 seconds.
          </p>
        </div>
      </div>
    </div>
  );
} 