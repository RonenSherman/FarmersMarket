// Debug market date retrieval
const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase URL and anon key here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMarketDate() {
  console.log('🔍 Debugging Market Date Retrieval\n');
  
  // Test different date formats
  const now = new Date();
  const utcDate = now.toISOString().split('T')[0];
  const localDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  
  console.log('Current date/time info:');
  console.log(`  Full date: ${now.toISOString()}`);
  console.log(`  UTC date (what getToday() uses): ${utcDate}`);
  console.log(`  Local date: ${localDate}`);
  console.log(`  Day of week: ${now.getDay()} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]})`);
  
  // Test the getToday function logic
  console.log('\n📊 Testing getToday() function:');
  
  try {
    // Get all market dates to see what's in the database
    const { data: allDates, error: allError } = await supabase
      .from('market_dates')
      .select('*')
      .order('date');
    
    if (allError) {
      console.log('❌ Error fetching all dates:', allError);
      return;
    }
    
    console.log(`Found ${allDates.length} market dates in database:`);
    allDates.forEach((date, index) => {
      console.log(`  ${index + 1}. ${date.date} - Active: ${date.is_active}, Status: ${date.weather_status}`);
    });
    
    // Test getToday with UTC date
    console.log(`\n🔍 Testing getToday() with UTC date: ${utcDate}`);
    const { data: todayUTC, error: errorUTC } = await supabase
      .from('market_dates')
      .select('*')
      .eq('date', utcDate)
      .eq('is_active', true)
      .single();
    
    if (errorUTC) {
      console.log(`  ❌ Error with UTC date: ${errorUTC.message}`);
    } else {
      console.log(`  ✅ Found market date with UTC:`, todayUTC);
    }
    
    // Test getToday with local date
    console.log(`\n🔍 Testing getToday() with local date: ${localDate}`);
    const { data: todayLocal, error: errorLocal } = await supabase
      .from('market_dates')
      .select('*')
      .eq('date', localDate)
      .eq('is_active', true)
      .single();
    
    if (errorLocal) {
      console.log(`  ❌ Error with local date: ${errorLocal.message}`);
    } else {
      console.log(`  ✅ Found market date with local:`, todayLocal);
    }
    
    // Check if there are any dates for today (any format)
    console.log(`\n🔍 Checking for any dates that might match today:`);
    const { data: todayAny, error: errorAny } = await supabase
      .from('market_dates')
      .select('*')
      .or(`date.eq.${utcDate},date.eq.${localDate}`)
      .eq('is_active', true);
    
    if (errorAny) {
      console.log(`  ❌ Error checking any format: ${errorAny.message}`);
    } else {
      console.log(`  Found ${todayAny.length} potential matches:`, todayAny);
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

debugMarketDate().catch(console.error); 