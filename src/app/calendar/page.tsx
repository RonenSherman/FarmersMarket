'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { format, isThursday, isBefore, isAfter } from 'date-fns';

export default function CalendarPage() {
  const [marketDates, setMarketDates] = useState<Date[]>([]);

  useEffect(() => {
    // Generate next 24 Thursdays (6 months)
    const generateMarketDates = () => {
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
      
      // Generate 24 Thursdays
      for (let i = 0; i < 24; i++) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      return dates;
    };

    setMarketDates(generateMarketDates());
  }, []);

  const isMarketToday = (date: Date) => {
    const today = new Date();
    return (
      date.toDateString() === today.toDateString() &&
      isThursday(today) &&
      today.getHours() < 18.5
    );
  };

  const isMarketPast = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return isThursday(today) && today.getHours() >= 18.5;
    }
    return isBefore(date, today);
  };

  const getMarketStatus = (date: Date) => {
    if (isMarketToday(date)) {
      return { status: 'active', label: 'Market Open Now', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (isMarketPast(date)) {
      return { status: 'past', label: 'Market Ended', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    } else {
      return { status: 'upcoming', label: 'Upcoming Market', color: 'bg-market-100 text-market-800 border-market-200' };
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-earth-800 mb-4">
            Market Calendar
          </h1>
          <p className="text-lg text-earth-600 max-w-2xl mx-auto">
            The Duvall Farmers Market is held every Thursday. Mark your calendar and join us for fresh, 
            local produce and artisan goods from our community vendors.
          </p>
        </div>

        {/* Market Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-earth-800 mb-4">Market Information</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start">
              <CalendarIcon className="h-6 w-6 text-market-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-earth-800">When</h3>
                <p className="text-earth-600">Every Thursday</p>
              </div>
            </div>
            <div className="flex items-start">
              <ClockIcon className="h-6 w-6 text-market-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-earth-800">Time</h3>
                <p className="text-earth-600">3:00 PM - 6:30 PM</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPinIcon className="h-6 w-6 text-market-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-earth-800">Location</h3>
                <p className="text-earth-600">Duvall Civic Center<br />15535 Main St NE, Duvall, WA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketDates.map((date, index) => {
            const marketInfo = getMarketStatus(date);
            
            return (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all duration-200 hover:shadow-lg ${
                  marketInfo.status === 'active' ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-earth-800 mb-2">
                    {format(date, 'd')}
                  </div>
                  <div className="text-lg font-semibold text-earth-700 mb-1">
                    {format(date, 'MMMM yyyy')}
                  </div>
                  <div className="text-sm text-earth-600 mb-4">
                    {format(date, 'EEEE')}
                  </div>
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${marketInfo.color}`}>
                    {marketInfo.label}
                  </div>
                  
                  {marketInfo.status === 'active' && (
                    <div className="mt-4">
                      <div className="text-sm text-green-700 font-medium">
                        🎪 Market is open now!
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Visit us until 6:30 PM
                      </div>
                    </div>
                  )}
                  
                  {marketInfo.status === 'upcoming' && (
                    <div className="mt-4">
                      <div className="text-sm text-market-700">
                        3:00 PM - 6:30 PM
                      </div>
                      <div className="text-xs text-earth-600 mt-1">
                        Pre-orders available online
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-earth-800 mb-4">Plan Your Visit</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-earth-800 mb-3">What to Expect</h3>
              <ul className="space-y-2 text-earth-600">
                <li>• Fresh, locally grown produce</li>
                <li>• Artisan baked goods and preserves</li>
                <li>• Handcrafted items and artwork</li>
                <li>• Seasonal flowers and plants</li>
                <li>• Local honey and dairy products</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-earth-800 mb-3">Tips for Visitors</h3>
              <ul className="space-y-2 text-earth-600">
                <li>• Arrive early for the best selection</li>
                <li>• Bring reusable bags for your purchases</li>
                <li>• Most vendors accept both cash and cards</li>
                <li>• Pre-order online for guaranteed availability</li>
                <li>• Free parking available on-site</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Weather Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800">Weather Policy</h3>
              <p className="text-yellow-700 text-sm mt-1">
                The market operates rain or shine! In case of severe weather conditions, 
                check our website or social media for any updates or cancellations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 