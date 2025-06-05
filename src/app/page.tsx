'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useMarketStore } from '@/store/marketStore';
import { isMarketOpen, getNextMarketDate, formatMarketDate, getMarketEndTime, formatProductType } from '@/lib/utils';
import { ProductType } from '@/types';

export default function HomePage() {
  const { marketStatus, setMarketStatus, vendors } = useMarketStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Update market status
    const isOpen = isMarketOpen();
    const nextDate = getNextMarketDate();
    
    setMarketStatus({
      isOpen,
      nextMarketDate: formatMarketDate(nextDate),
      currentMarketEndTime: isOpen ? getMarketEndTime() : null,
      activeVendors: vendors.filter(vendor => 
        vendor.available_dates.includes(nextDate.toISOString().split('T')[0])
      )
    });
  }, [setMarketStatus, vendors]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  // Get unique product types from active vendors
  const activeProductTypes = Array.from(
    new Set(marketStatus.activeVendors.map(vendor => vendor.product_type))
  );

  const productTypeColors: Record<ProductType, string> = {
    produce: 'bg-green-100 text-green-800 border-green-200',
    meat: 'bg-red-100 text-red-800 border-red-200',
    dairy: 'bg-blue-100 text-blue-800 border-blue-200',
    baked_goods: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    crafts: 'bg-purple-100 text-purple-800 border-purple-200',
    artisan_goods: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    flowers: 'bg-pink-100 text-pink-800 border-pink-200',
    honey: 'bg-amber-100 text-amber-800 border-amber-200',
    preserves: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-earth-50 to-market-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-earth-800 mb-6">
              Duvall Farmers Market
            </h1>
            <p className="text-xl md:text-2xl text-earth-600 mb-8">
              Online Service
            </p>
            
            {/* Market Status */}
            <div className="max-w-2xl mx-auto">
              {marketStatus.isOpen ? (
                <div className="bg-market-100 border border-market-200 rounded-lg p-6 mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <ClockIcon className="h-8 w-8 text-market-600 mr-3" />
                    <h2 className="text-2xl font-semibold text-market-800">
                      Farmers Market Open!
                    </h2>
                  </div>
                  <p className="text-lg text-market-700">
                    Market ongoing until {marketStatus.currentMarketEndTime}
                  </p>
                  <p className="text-sm text-market-600 mt-2">
                    {marketStatus.activeVendors.length} vendors available today
                  </p>
                </div>
              ) : (
                <div className="bg-earth-100 border border-earth-200 rounded-lg p-6 mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <CalendarIcon className="h-8 w-8 text-earth-600 mr-3" />
                    <h2 className="text-2xl font-semibold text-earth-800">
                      Market Closed
                    </h2>
                  </div>
                  <p className="text-lg text-earth-700">
                    Come back on {marketStatus.nextMarketDate} for the Duvall Farmers Market
                  </p>
                </div>
              )}
            </div>

            {/* Product Categories - Only show when market is open */}
            {marketStatus.isOpen && activeProductTypes.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl font-semibold text-earth-800 mb-6">
                  Shop by Category
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activeProductTypes.map((productType) => (
                    <Link
                      key={productType}
                      href={`/category/${productType}`}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${
                        productTypeColors[productType]
                      }`}
                    >
                      <div className="text-center">
                        <h4 className="font-semibold text-lg">
                          {formatProductType(productType)}
                        </h4>
                        <p className="text-sm opacity-75 mt-1">
                          {marketStatus.activeVendors.filter(v => v.product_type === productType).length} vendors
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action */}
            {!marketStatus.isOpen && (
              <div className="mt-12">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/calendar"
                    className="btn-primary text-lg px-8 py-3"
                  >
                    View Market Calendar
                  </Link>
                  <Link
                    href="/vendor-signup"
                    className="btn-secondary text-lg px-8 py-3"
                  >
                    Become a Vendor
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-earth-800 mb-4">
              Fresh, Local, Community-Driven
            </h2>
            <p className="text-lg text-earth-600 max-w-2xl mx-auto">
              Every Thursday, our local farmers and artisans bring the best of Duvall to you. 
              Pre-order online and pick up at the market.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🥕</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-2">Fresh Produce</h3>
              <p className="text-earth-600">
                Seasonal fruits and vegetables grown locally by our community farmers.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-2">Artisan Goods</h3>
              <p className="text-earth-600">
                Handcrafted items, baked goods, and artisanal products made with care.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-2">Community</h3>
              <p className="text-earth-600">
                Supporting local businesses and bringing our community together every week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 