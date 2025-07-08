'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { vendorService } from '@/lib/database';
import { PaymentOAuthService } from '@/lib/paymentOAuth';
import { PRODUCT_TYPE_OPTIONS } from '@/lib/utils';
import { ProductType, PaymentConnection } from '@/types';
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface VendorFormData {
  name: string;
  contact_email: string;
  contact_phone: string;
  product_type: ProductType;
  api_consent: boolean;
  available_dates: string[];
}

export default function VendorSignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'square' | 'stripe' | null>(null);
  const [paymentConnection, setPaymentConnection] = useState<PaymentConnection | null>(null);
  const [tempVendorId, setTempVendorId] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'payment' | 'complete'>('form');
  
  const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm<VendorFormData>();

  // Generate next 12 Thursdays for date selection
  const generateThursdayDates = () => {
    const dates = [];
    const today = new Date();
    let currentDate = new Date(today);
    
    // Find next Thursday
    const daysUntilThursday = (4 - currentDate.getDay() + 7) % 7;
    if (daysUntilThursday === 0 && currentDate.getHours() >= 18) {
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      currentDate.setDate(currentDate.getDate() + daysUntilThursday);
    }
    
    // Generate 12 Thursdays
    for (let i = 0; i < 12; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return dates;
  };

  const thursdayDates = generateThursdayDates();

  const handleDateToggle = (dateString: string) => {
    setSelectedDates(prev => 
      prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
  };

  const onSubmitBasicInfo = async (data: VendorFormData) => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one market date');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const vendorData = {
        ...data,
        available_dates: selectedDates,
        payment_method: null, // Using new OAuth payment system
        payment_connected: false
      };

      // Create vendor record first
      const newVendor = await vendorService.create(vendorData);
      setTempVendorId(newVendor.id);
      
      // Send welcome email immediately after vendor creation
      try {
        console.log('Sending welcome email for new vendor:', newVendor.id);
        const emailResponse = await fetch('/api/send-vendor-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId: newVendor.id })
        });
        
        const emailResult = await emailResponse.json();
        console.log('Welcome email result (after signup):', emailResult);
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully');
          toast.success('Basic information saved! Check your email for confirmation. Now connect your payment account.');
        } else {
          console.error('❌ Failed to send welcome email:', emailResult.message);
          toast.success('Basic information saved! Now connect your payment account.');
        }
      } catch (emailError) {
        console.error('❌ Error sending welcome email:', emailError);
        toast.success('Basic information saved! Now connect your payment account.');
      }
      
      setStep('payment');
      
    } catch (error) {
      console.error('Error submitting vendor application:', error);
      
      if (error && typeof error === 'object') {
        if ('code' in error && error.code === '23505') {
          if ('details' in error && typeof error.details === 'string' && error.details.includes('contact_email')) {
            toast.error('An account with this email already exists. Please use a different email address.');
          } else {
            toast.error('This information already exists in our system. Please check your details.');
          }
        } else if (error instanceof Error) {
          if (error.message.includes('invalid input')) {
            toast.error('Please check your form data and try again.');
          } else {
            toast.error('Failed to submit application. Please try again or contact support.');
          }
        } else {
          toast.error('Failed to submit application. Please try again.');
        }
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentConnect = async (provider: 'square' | 'stripe') => {
    if (!tempVendorId) {
      toast.error('Please complete the basic information first.');
      return;
    }

    setSelectedProvider(provider);
    
    try {
      // Validate configuration first
      const configResponse = await fetch('/api/oauth/config');
      const config = await configResponse.json();
      
      if (!config.validation.valid) {
        console.error('OAuth configuration errors:', config.validation.errors);
        toast.error(`Configuration error: ${config.validation.errors.join(', ')}`);
        setSelectedProvider(null);
        return;
      }

      // Generate OAuth URL and redirect
      const authUrl = PaymentOAuthService.generateAuthUrl(provider, tempVendorId);
      console.log(`Redirecting to ${provider} OAuth:`, authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      toast.error(`Failed to connect ${provider} account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSelectedProvider(null);
    }
  };



  const handleSkipPayment = async () => {
    if (tempVendorId) {
      try {
        console.log('Sending welcome email for vendor (skip payment):', tempVendorId);
        const emailResponse = await fetch('/api/send-vendor-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId: tempVendorId })
        });
        
        const emailResult = await emailResponse.json();
        console.log('Welcome email result (skip payment):', emailResult);
        
        if (!emailResult.success) {
          console.error('Failed to send welcome email:', emailResult.message);
        }
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't block the user flow if email fails
      }
    }
    
    toast.success('Application submitted! You can connect your payment account later from the vendor portal.');
    setStep('complete');
    reset();
    setSelectedDates([]);
    setTempVendorId(null);
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast.error(`Payment connection failed: ${error}`);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const stateData = PaymentOAuthService.parseState(state);
      if (!stateData) {
        throw new Error('Invalid OAuth state');
      }

      const { vendorId, provider } = stateData;
      setTempVendorId(vendorId);

      let connection: PaymentConnection;
      if (provider === 'square') {
        connection = await PaymentOAuthService.exchangeSquareCode(code, vendorId);
      } else {
        connection = await PaymentOAuthService.exchangeStripeCode(code, vendorId);
      }

      setPaymentConnection(connection);
      
      // Send welcome email after successful OAuth connection
      try {
        console.log('Sending welcome email for vendor:', vendorId);
        const emailResponse = await fetch('/api/send-vendor-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId })
        });
        
        const emailResult = await emailResponse.json();
        console.log('Welcome email result:', emailResult);
        
        if (!emailResult.success) {
          console.error('Failed to send welcome email:', emailResult.message);
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't block the user flow if email fails
      }
      
      setStep('complete');
      toast.success(`${provider === 'square' ? 'Square' : 'Stripe'} account connected successfully!`);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error('Failed to complete payment connection. Please try again.');
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-earth-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-earth-800 mb-4">
              Application Submitted Successfully!
            </h1>
            <p className="text-lg text-earth-600 mb-6">
                              Thank you for applying to become a vendor at the Duvall Farmers Market Online Service.
            </p>
            
            {paymentConnection ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800 font-medium">
                    {paymentConnection.provider === 'square' ? 'Square' : 'Stripe'} account connected
                  </span>
                </div>
                <p className="text-green-700 text-sm">
                  You're all set to receive payments.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-yellow-800 font-medium">
                    Payment account not connected
                  </span>
                </div>
                <p className="text-yellow-700 text-sm">
                  You can connect your payment account later from the vendor portal.
                </p>
              </div>
            )}

            <div className="bg-earth-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-earth-800 mb-3">What happens next?</h3>
              <ul className="text-sm text-earth-600 space-y-2 text-left">
                <li>• Your application will be reviewed within 2-3 business days</li>
                <li>• You'll receive an email confirmation with your application status</li>
                <li>• Market coordinators will contact you to discuss setup details</li>
                <li>• You'll gain access to the vendor portal</li>
                <li>• You can then add products and manage your market presence</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setStep('form');
                setPaymentConnection(null);
                setTempVendorId(null);
              }}
              className="btn-primary"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-earth-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-earth-800 mb-4">
                Connect Your Payment Account
              </h1>
              <p className="text-lg text-earth-600">
                Connect your Square or Stripe account to receive payments from customers
              </p>
            </div>

            <div className="space-y-6">
              {/* Square Option */}
              <div className="border-2 border-earth-200 rounded-lg p-6 hover:border-market-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">□</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-earth-800">Square</h3>
                        <p className="text-earth-600">Connect your Square merchant account</p>
                      </div>
                    </div>
                    <ul className="text-sm text-earth-600 space-y-1 mb-4">
                      <li>• Accept all major credit and debit cards</li>
                      <li>• 2.6% + 10¢ per transaction</li>
                      <li>• Next-day deposits</li>
                      <li>• Built-in fraud protection</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => handlePaymentConnect('square')}
                  className="w-full btn-primary"
                  disabled={selectedProvider === 'square'}
                >
                  {selectedProvider === 'square' ? 'Connecting...' : 'Connect Square Account'}
                </button>
              </div>

              {/* Stripe Option */}
              <div className="border-2 border-earth-200 rounded-lg p-6 hover:border-market-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">S</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-earth-800">Stripe</h3>
                        <p className="text-earth-600">Connect your Stripe account</p>
                      </div>
                    </div>
                    <ul className="text-sm text-earth-600 space-y-1 mb-4">
                      <li>• Accept cards, Apple Pay, Google Pay</li>
                      <li>• 2.9% + 30¢ per transaction</li>
                      <li>• 2-day deposits</li>
                      <li>• Advanced analytics and reporting</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => handlePaymentConnect('stripe')}
                  className="w-full btn-secondary"
                  disabled={selectedProvider === 'stripe'}
                >
                  {selectedProvider === 'stripe' ? 'Connecting...' : 'Connect Stripe Account'}
                </button>
              </div>

              {/* Skip Option */}
              <div className="text-center pt-6 border-t border-earth-200">
                <p className="text-earth-600 mb-4">
                  Don't have a payment account yet? You can connect one later.
                </p>
                <button
                  onClick={handleSkipPayment}
                  className="text-earth-500 hover:text-earth-700 underline"
                >
                  Skip for now and complete later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-earth-800 mb-4">
              Become a Vendor
            </h1>
            <p className="text-lg text-earth-600">
              Join the Duvall Farmers Market Online Service community and share your products with local customers
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmitBasicInfo)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-earth-700 mb-2">
                  Business/Vendor Name *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Business name is required' })}
                  className="input-field"
                  placeholder="Your business name"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="product_type" className="block text-sm font-medium text-earth-700 mb-2">
                  Product Type *
                </label>
                <select
                  id="product_type"
                  {...register('product_type', { required: 'Product type is required' })}
                  className="input-field"
                >
                  <option value="">Select product type</option>
                  {PRODUCT_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.product_type && (
                  <p className="text-red-600 text-sm mt-1">{errors.product_type.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-earth-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="contact_email"
                  {...register('contact_email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input-field"
                  placeholder="your@email.com"
                />
                {errors.contact_email && (
                  <p className="text-red-600 text-sm mt-1">{errors.contact_email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-earth-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  {...register('contact_phone', { required: 'Phone number is required' })}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
                {errors.contact_phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.contact_phone.message}</p>
                )}
              </div>
            </div>

            {/* Payment Integration Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <CreditCardIcon className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">Modern Payment Processing</h3>
                  <p className="text-blue-700 text-sm mb-2">
                    All customer payments are processed online through secure, integrated payment systems. 
                    After submitting your basic information, you'll connect your Square or Stripe merchant account.
                  </p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Secure OAuth integration with your payment provider</li>
                    <li>• Automatic order notifications and payment processing</li>
                    <li>• Real-time transaction tracking and reporting</li>
                    <li>• No manual payment handling required</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* API Consent */}
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register('api_consent', { required: 'API consent is required' })}
                  className="mr-3 mt-1"
                />
                <span className="text-sm text-earth-700">
                  I consent to integrate my payment processing system with the market's platform 
                  for seamless order processing and payment verification. This enables automatic 
                  order notifications and secure payment handling. *
                </span>
              </label>
              {errors.api_consent && (
                <p className="text-red-600 text-sm mt-1">{errors.api_consent.message}</p>
              )}
            </div>

            {/* Available Dates */}
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-4">
                Select Market Dates You'll Attend *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {thursdayDates.map((date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const isSelected = selectedDates.includes(dateString);
                  
                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => handleDateToggle(dateString)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-market-100 border-market-500 text-market-800'
                          : 'bg-white border-earth-200 text-earth-700 hover:border-market-300'
                      }`}
                    >
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </button>
                  );
                })}
              </div>
              {selectedDates.length === 0 && (
                <p className="text-earth-600 text-sm mt-2">
                  Please select at least one market date
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Continue to Payment Setup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 