'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { vendorService } from '@/lib/database';
import { PRODUCT_TYPE_OPTIONS } from '@/lib/utils';
import { ProductType } from '@/types';

interface VendorFormData {
  name: string;
  contact_email: string;
  contact_phone: string;
  product_type: ProductType;
  api_consent: boolean;
  payment_method: 'square' | 'swipe';
  available_dates: string[];
}

export default function VendorSignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorFormData>();

  // Ensure we're in client-side environment
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const onSubmit = async (data: VendorFormData) => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one market date');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const vendorData = {
        ...data,
        available_dates: selectedDates,
      };

      // Use the database service
      const newVendor = await vendorService.create(vendorData);

      toast.success(`Vendor application submitted successfully! Application ID: ${newVendor.id.slice(0, 8)}...`);
      reset();
      setSelectedDates([]);
      
      // Show success details
      setTimeout(() => {
        toast.success('You will receive an email confirmation within 24 hours.', {
          duration: 6000,
        });
      }, 2000);

    } catch (error) {
      console.error('Error submitting vendor application:', error);
      
      // Show user-friendly error message
      if (error && typeof error === 'object') {
        // Handle PostgreSQL duplicate key error
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

  // Don't render form until client-side to prevent hydration issues
  if (!isClient) {
    return (
      <div className="min-h-screen bg-earth-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-market-600 mx-auto"></div>
          <p className="mt-4 text-earth-600">Loading vendor signup form...</p>
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
              Join the Duvall Farmers Market community and share your products with local customers
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Card Reader System */}
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-2">
                Card Reader System *
              </label>
              <p className="text-sm text-earth-600 mb-3">
                All payments are processed online with card only. Please select your preferred card reader system for order fulfillment verification.
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="square"
                    {...register('payment_method', { required: 'Card reader system is required' })}
                    className="mr-2"
                  />
                  Square (Square Terminal, Square Reader)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="swipe"
                    {...register('payment_method', { required: 'Card reader system is required' })}
                    className="mr-2"
                  />
                  Swipe (Stripe Terminal, other systems)
                </label>
              </div>
              {errors.payment_method && (
                <p className="text-red-600 text-sm mt-1">{errors.payment_method.message}</p>
              )}
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
                  I consent to integrate my payment processing system (card reader/POS) with the market's API 
                  for seamless order processing and payment verification. *
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
                  'Submit Vendor Application'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-earth-50 rounded-lg">
            <h3 className="font-semibold text-earth-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-earth-600 space-y-1">
              <li>• Your application is stored securely in our database</li>
              <li>• We'll review your application within 2-3 business days</li>
              <li>• You'll receive an email confirmation with next steps</li>
              <li>• Market coordinators will contact you to discuss setup details</li>
              <li>• You'll gain access to the vendor portal to manage your products</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 