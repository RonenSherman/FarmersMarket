const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qsnvkyzpjppptnuvojtq.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbnZreXpwanBwcHRudXZvanRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzE5MzUsImV4cCI6MjA1MDMwNzkzNX0.lqPnKtcNO4wAkpKfAFvJz4Q_Sw3JV14mHQNgJXdZ9bo'
);

async function testMarketStatus() {
  console.log('🔍 Testing Market Status...\n');
  
  // Test date formats
  const now = new Date();
  const todayLocal = now.toLocaleDateString('en-CA');
  const todayISO = now.toISOString().split('T')[0];
  
  console.log('📅 Date Information:');
  console.log('Current time:', now.toString());
  console.log('Local date (en-CA):', todayLocal);
  console.log('ISO date:', todayISO);
  console.log('');
  
  // Get all market dates
  console.log('📋 All Market Dates:');
  const { data: allDates, error: allError } = await supabase
    .from('market_dates')
    .select('*')
    .order('date');
    
  if (allError) {
    console.error('Error fetching all market dates:', allError);
  } else {
    console.table(allDates);
  }
  console.log('');
  
  // Test today's market date query (using local date format)
  console.log('🔍 Testing Today\'s Market (Local Date):');
  const { data: todayMarketLocal, error: localError } = await supabase
    .from('market_dates')
    .select('*')
    .eq('date', todayLocal)
    .eq('is_active', true);
    
  console.log('Query: date =', todayLocal, '& is_active = true');
  if (localError) {
    console.error('Error:', localError);
  } else {
    console.log('Result:', todayMarketLocal);
  }
  console.log('');
  
  // Test today's market date query (using ISO date format)
  console.log('🔍 Testing Today\'s Market (ISO Date):');
  const { data: todayMarketISO, error: isoError } = await supabase
    .from('market_dates')
    .select('*')
    .eq('date', todayISO)
    .eq('is_active', true);
    
  console.log('Query: date =', todayISO, '& is_active = true');
  if (isoError) {
    console.error('Error:', isoError);
  } else {
    console.log('Result:', todayMarketISO);
  }
  console.log('');
  
  // Test market opening logic
  if (todayMarketLocal && todayMarketLocal.length > 0) {
    const market = todayMarketLocal[0];
    console.log('🕐 Testing Market Times:');
    console.log('Market:', market);
    console.log('Start time:', market.start_time);
    console.log('End time:', market.end_time);
    console.log('Weather status:', market.weather_status);
    console.log('Is active:', market.is_active);
    
    // Test the time logic
    const [startHour, startMinute] = market.start_time.split(':').map(Number);
    const [endHour, endMinute] = market.end_time.split(':').map(Number);

    const marketStartTime = new Date();
    marketStartTime.setHours(startHour, startMinute, 0, 0);

    const marketEndTime = new Date();
    marketEndTime.setHours(endHour, endMinute, 0, 0);
    
    console.log('Market start time (today):', marketStartTime.toString());
    console.log('Market end time (today):', marketEndTime.toString());
    console.log('Current time:', now.toString());
    console.log('Is market open?:', now >= marketStartTime && now <= marketEndTime);
  }
}

testMarketStatus().catch(console.error); 