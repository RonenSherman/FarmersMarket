'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, CalendarDaysIcon, InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useMarketStore } from '@/store/marketStore';
import { isMarketOpen, getNextMarketDate, formatMarketDate, getMarketEndTime, formatProductType } from '@/lib/utils';
import { ProductType } from '@/types';

const MarketStatus = () => {
  const { marketStatus } = useMarketStore();
  
  return (
    <div className="max-w-2xl mx-auto">
      {marketStatus.isOpen ? (
        <div className="bg-gradient-to-r from-sage-50 to-sage-100 border border-sage-200 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center mb-4">
            <ClockIcon className="h-10 w-10 text-sage-600 mr-4" />
            <h2 className="text-3xl font-bold text-sage-800">
              Market Open! 🎉
            </h2>
          </div>
          <p className="text-xl text-sage-700 mb-4">
            Come visit us until <strong>{marketStatus.currentMarketEndTime}</strong>
          </p>
          <p className="text-sage-600 mb-6">
            {marketStatus.activeVendors.length} vendors available today
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/shop"
              className="bg-sage-600 text-white py-3 px-6 rounded-lg hover:bg-sage-700 transition-colors font-medium text-center"
            >
              🛒 Shop Now
            </Link>
            <Link
              href="/calendar"
              className="bg-white text-sage-600 py-3 px-6 rounded-lg hover:bg-sage-50 transition-colors font-medium text-center border border-sage-200"
            >
              📅 View Calendar
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-sage-50 to-sage-100 border border-sage-200 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center mb-4">
            <CalendarIcon className="h-10 w-10 text-sage-600 mr-4" />
            <h2 className="text-3xl font-bold text-sage-800">
              Market Closed
            </h2>
          </div>
          <p className="text-xl text-sage-700 mb-6">
            Next market: <strong>{marketStatus.nextMarketDate}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/shop"
              className="bg-sage-600 text-white py-3 px-6 rounded-lg hover:bg-sage-700 transition-colors font-medium text-center"
            >
              🛍️ Browse Products
            </Link>
            <Link
              href="/vendor-signup"
              className="bg-white text-sage-600 py-3 px-6 rounded-lg hover:bg-sage-50 transition-colors font-medium text-center border border-sage-200"
            >
              🤝 Become Vendor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

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
    produce: 'bg-sage-100 text-sage-800 border-sage-200',
    meat: 'bg-brown-100 text-brown-800 border-brown-200',
    dairy: 'bg-slate-100 text-slate-800 border-slate-200',
    baked_goods: 'bg-brown-50 text-brown-800 border-brown-100',
    crafts: 'bg-stone-100 text-stone-800 border-stone-200',
    artisan_goods: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    flowers: 'bg-rose-50 text-rose-800 border-rose-100',
    honey: 'bg-brown-200 text-brown-800 border-brown-300',
    preserves: 'bg-brown-300 text-brown-800 border-brown-400',
  };

  return (
    <div className="min-h-screen bg-brown-50">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-sage-800 mb-4">
            Duvall Farmers Market
          </h1>
          <p className="text-xl text-sage-600 mb-12">Online Service</p>

          {/* Market Status */}
          <div className="bg-gradient-to-br from-brown-100 to-sage-50 rounded-2xl p-8 mb-8 border border-sage-200">
            <MarketStatus />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/shop"
              className="bg-sage-600 hover:bg-sage-700 text-white py-4 px-8 rounded-lg transition-colors text-lg font-medium"
            >
              Shop Fresh Products
            </Link>
            <Link
              href="/calendar"
              className="bg-sage-600 hover:bg-sage-700 text-white py-4 px-8 rounded-lg transition-colors text-lg font-medium"
            >
              View Market Calendar
            </Link>
            <Link
              href="/vendor-signup"
              className="bg-brown-600 hover:bg-brown-700 text-white py-4 px-8 rounded-lg transition-colors text-lg font-medium"
            >
              Become a Vendor
            </Link>
          </div>

          {/* Community Message */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-sage-800 mb-4">
              Fresh, Local, Community-Driven
            </h2>
            <p className="text-lg text-sage-600 max-w-2xl mx-auto leading-relaxed">
              Every Thursday, our local farmers and artisans bring the best of Duvall to you.<br />
              Pre-order online and pick up at the market.
            </p>
          </div>
        </div>
      </section>

      {/* Product Categories - Only show when market is open */}
      {marketStatus.isOpen && activeProductTypes.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-sage-800 mb-4">
                Shop by Category 🛒
              </h2>
              <p className="text-lg text-sage-600">
                Browse our fresh selection organized by product type
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {activeProductTypes.map((productType) => (
                <Link
                  key={productType}
                  href="/shop"
                  className={`p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                    productTypeColors[productType]
                  }`}
                >
                  <div className="text-center">
                    <h4 className="font-semibold text-lg mb-2">
                      {formatProductType(productType)}
                    </h4>
                    <p className="text-sm opacity-75">
                      {marketStatus.activeVendors.filter(v => v.product_type === productType).length} vendors
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-white to-sage-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-sage-800 mb-6">
              Why Choose <span className="text-sage-700">Duvall Farmers Market Online Service</span>
            </h2>
            <p className="text-xl text-sage-600 max-w-3xl mx-auto leading-relaxed">
              We're not just another market – we're where neighbors become friends, 
              where every tomato has a story, and where community grows alongside the crops
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sage-100 to-sage-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-3xl">🥕</span>
              </div>
              <h3 className="text-xl font-bold text-sage-700 mb-3">Picked This Morning</h3>
              <p className="text-sage-600 leading-relaxed">
                That crunch you hear? That's the sound of vegetables picked before dawn, 
                still kissed by morning dew
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sage-100 to-sage-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-3xl">🎨</span>
              </div>
              <h3 className="text-xl font-bold text-sage-700 mb-3">Made with Love</h3>
              <p className="text-sage-600 leading-relaxed">
                Every jar of jam, every loaf of bread, every handwoven basket 
                carries the heart and soul of its maker
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sage-100 to-sage-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-3xl">🌱</span>
              </div>
              <h3 className="text-xl font-bold text-sage-700 mb-3">Earth-Friendly</h3>
              <p className="text-sage-600 leading-relaxed">
                From our soil to your soul – we practice what we preach 
                when it comes to caring for our beautiful planet
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sage-100 to-sage-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-3xl">🤗</span>
              </div>
              <h3 className="text-xl font-bold text-sage-700 mb-3">Family Vibes</h3>
              <p className="text-sage-600 leading-relaxed">
                Whether you're 5 or 95, you'll find your place in our market family. 
                Everyone has a story, and we love hearing them all
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-20 bg-gradient-to-br from-brown-100 via-brown-200 to-sage-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-sage-800 mb-4">
              Learn More About Us
            </h2>
            <p className="text-lg text-sage-600">
              Discover more about our community and how to get involved
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Link
              href="/about"
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-brown-200"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <InformationCircleIcon className="h-8 w-8 text-sage-700" />
                </div>
                <h3 className="text-xl font-bold text-sage-800 mb-3">Our Story</h3>
                <p className="text-sage-600 leading-relaxed">
                  From humble beginnings to thriving community hub – 
                  discover the heart behind our market
                </p>
                <div className="mt-4 text-sage-700 font-medium">
                  Learn More →
                </div>
              </div>
            </Link>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-brown-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">📍</span>
                </div>
                <h3 className="text-xl font-bold text-sage-800 mb-3">Visit Us</h3>
                <div className="text-sage-600 leading-relaxed space-y-2">
                  <p><strong>When:</strong> Every Thursday</p>
                  <p><strong>Time:</strong> 3:00 PM - 6:30 PM</p>
                  <p><strong>Where:</strong> Downtown Duvall</p>
                  <p className="text-sm text-sage-500 mt-4">
                    Weather permitting - check our calendar for updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-sage-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Visit Us This Thursday! 🎪
          </h2>
          <p className="text-xl text-sage-100 mb-8 max-w-2xl mx-auto">
            Experience the freshest local produce, meet your neighbors, and support 
            the local community. Every Thursday from 3:00 PM to 6:30 PM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="bg-white text-sage-600 py-4 px-8 rounded-lg hover:bg-sage-50 transition-colors text-lg font-medium inline-flex items-center space-x-2"
            >
              <span>🛍️</span>
              <span>Browse Products</span>
            </Link>
            <Link
              href="/calendar"
              className="bg-sage-700 text-white py-4 px-8 rounded-lg hover:bg-sage-800 transition-colors text-lg font-medium inline-flex items-center space-x-2"
            >
              <span>📅</span>
              <span>Check Dates</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
} 