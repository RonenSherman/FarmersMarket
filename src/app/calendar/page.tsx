'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { format, isThursday, isBefore, isAfter, addWeeks, startOfDay } from 'date-fns';
import { marketDateService } from '@/lib/database';
import type { MarketDate } from '@/types';

export default function CalendarPage() {
  const [marketDates, setMarketDates] = useState<MarketDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketDates();
  }, []);

  const loadMarketDates = async () => {
    try {
      // Get all market dates from database
      const allDates = await marketDateService.getAll();
      console.log('All dates from database:', allDates);
      console.log('Database dates length:', allDates.length);
      
      // Log each date with its day of week
      console.log('Individual dates from database:');
      allDates.forEach((date, index) => {
        // Fix timezone issue by ensuring date is parsed in local timezone
        const dateObj = new Date(date.date + 'T00:00:00');
        console.log(`Date ${index + 1}: ${date.date} (${dateObj.toDateString()}) - Day of week: ${dateObj.getDay()} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()]})`);
      });
      
      // Sort all dates chronologically (no filtering since all are future dates)
      const sortedDates = allDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('Sorted dates:', sortedDates);
      console.log('Today is:', new Date().toISOString());

      // Always use database dates if they exist, only fallback if database is empty
      if (allDates.length > 0) {
        console.log('✅ Using database dates - count:', sortedDates.length);
        setMarketDates(sortedDates);
        console.log('Using database dates:', sortedDates.length, 'dates');
      } else {
        console.log('❌ No database dates found, using generated dates');
        const generatedDates = generateUpcomingThursdays();
        setMarketDates(generatedDates);
        console.log('Using generated dates:', generatedDates.length, 'dates');
      }
    } catch (error) {
      console.error('Error loading market dates:', error);
      // Fallback to generated dates if database fails
      const generatedDates = generateUpcomingThursdays();
      setMarketDates(generatedDates);
      console.log('Using fallback generated dates due to error');
    } finally {
      setLoading(false);
    }
  };

  const generateUpcomingThursdays = (): MarketDate[] => {
    const dates: MarketDate[] = [];
    const today = new Date();
    let currentDate = new Date(today);

    console.log('Generating Thursdays starting from:', currentDate.toISOString());

    // Find next Thursday (4 = Thursday)
    let daysUntilThursday = (4 - currentDate.getDay() + 7) % 7;
    if (daysUntilThursday === 0 && currentDate.getHours() >= 18) {
      daysUntilThursday = 7;
    }
    currentDate.setDate(currentDate.getDate() + daysUntilThursday);

    console.log('First Thursday will be:', currentDate.toISOString());

    // Generate 12 upcoming Thursdays
    for (let i = 0; i < 12; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      console.log(`Generated date ${i}:`, dateString, 'Day of week:', currentDate.getDay());
      
      dates.push({
        id: `generated-${i}`,
        date: dateString,
        is_active: true,
        start_time: '15:00:00',
        end_time: '18:30:00',
        weather_status: 'scheduled',
        is_special_event: false,
        created_at: new Date().toISOString()
      });
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return dates;
  };

  const isMarketToday = (date: MarketDate) => {
    const today = new Date();
    // Fix timezone issue by ensuring date is parsed in local timezone
    const marketDate = new Date(date.date + 'T00:00:00');
    
    if (marketDate.toDateString() !== today.toDateString()) {
      return false;
    }

    // Remove the Thursday check - market can be on any day
    // Check if market is currently open using the actual times
    const now = new Date();
    const [startHour, startMinute] = date.start_time.split(':').map(Number);
    const [endHour, endMinute] = date.end_time.split(':').map(Number);
    
    const marketStartTime = new Date();
    marketStartTime.setHours(startHour, startMinute, 0, 0);
    
    const marketEndTime = new Date();
    marketEndTime.setHours(endHour, endMinute, 0, 0);
    
    return now >= marketStartTime && now <= marketEndTime;
  };

  const isMarketTodayButNotOpen = (date: MarketDate) => {
    const today = new Date();
    // Fix timezone issue by ensuring date is parsed in local timezone
    const marketDate = new Date(date.date + 'T00:00:00');
    
    if (marketDate.toDateString() !== today.toDateString()) {
      return false;
    }

    // Check if market is today but not currently within the time window
    const now = new Date();
    const [startHour, startMinute] = date.start_time.split(':').map(Number);
    const [endHour, endMinute] = date.end_time.split(':').map(Number);
    
    const marketStartTime = new Date();
    marketStartTime.setHours(startHour, startMinute, 0, 0);
    
    const marketEndTime = new Date();
    marketEndTime.setHours(endHour, endMinute, 0, 0);
    
    // It's today but either before start time or after end time
    return now < marketStartTime || now > marketEndTime;
  };

  const isMarketPast = (date: MarketDate) => {
    const today = new Date();
    // Fix timezone issue by ensuring date is parsed in local timezone
    const marketDate = new Date(date.date + 'T00:00:00');
    
    if (marketDate.toDateString() === today.toDateString()) {
      // If it's today, check if market has ended
      const now = new Date();
      const [endHour, endMinute] = date.end_time.split(':').map(Number);
      const marketEndTime = new Date();
      marketEndTime.setHours(endHour, endMinute, 0, 0);
      return now > marketEndTime;
    }
    
    return marketDate < today;
  };

  const getMarketStatus = (date: MarketDate) => {
    if (date.weather_status === 'cancelled') {
      return { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (date.weather_status === 'delayed') {
      return { status: 'delayed', label: 'Delayed', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else if (isMarketToday(date)) {
      return { status: 'active', label: 'Market Open Now', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (isMarketTodayButNotOpen(date)) {
      return { status: 'ongoing', label: 'Ongoing Today', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (isMarketPast(date)) {
      return { status: 'past', label: 'Market Ended', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    } else {
      return { status: 'upcoming', label: 'Upcoming Market', color: 'bg-market-100 text-market-800 border-market-200' };
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-market-600"></div>
          <p className="mt-4 text-earth-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-earth-800 mb-4">
            Market Calendar
          </h1>
          <p className="text-lg text-earth-600 max-w-2xl mx-auto">
            Check our calendar for upcoming market dates. Join us for fresh, 
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
                <p className="text-earth-600">Check calendar for dates</p>
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
          {marketDates.map((date) => {
            const marketInfo = getMarketStatus(date);
            // Fix timezone issue by ensuring date is parsed in local timezone
            const dateObj = new Date(date.date + 'T00:00:00');
            const formattedDay = format(dateObj, 'EEEE');
            const dayOfWeek = dateObj.getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            console.log(`Displaying date: ${date.date}, Date object: ${dateObj.toISOString()}, Day of week: ${dayOfWeek} (${dayNames[dayOfWeek]}), Formatted: ${formattedDay}`);
            
            return (
              <div
                key={date.id}
                className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all duration-200 hover:shadow-lg ${
                  marketInfo.status === 'active' ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-earth-800 mb-2">
                    {format(dateObj, 'd')}
                  </div>
                  <div className="text-lg font-semibold text-earth-700 mb-1">
                    {format(dateObj, 'MMMM yyyy')}
                  </div>
                  <div className="text-sm text-earth-600 mb-4">
                    {format(dateObj, 'EEEE')}
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
                        Visit us until {formatTime(date.end_time)}
                      </div>
                    </div>
                  )}
                  
                  {marketInfo.status === 'ongoing' && (
                    <div className="mt-4">
                      <div className="text-sm text-blue-700 font-medium">
                        📅 Market happening today
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {formatTime(date.start_time)} - {formatTime(date.end_time)}
                      </div>
                    </div>
                  )}

                  {marketInfo.status === 'upcoming' && (
                    <div className="mt-4">
                      <div className="text-sm text-market-700">
                        {formatTime(date.start_time)} - {formatTime(date.end_time)}
                      </div>
                      <div className="text-xs text-earth-600 mt-1">
                        Pre-orders available online
                      </div>
                    </div>
                  )}

                  {marketInfo.status === 'cancelled' && (
                    <div className="mt-4">
                      <div className="text-sm text-red-700 font-medium">
                        ❌ Market Cancelled
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Check back for updates
                      </div>
                    </div>
                  )}

                  {marketInfo.status === 'delayed' && (
                    <div className="mt-4">
                      <div className="text-sm text-yellow-700 font-medium">
                        ⏰ Market Delayed
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Check back for updates
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