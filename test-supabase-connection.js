// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT FOUND');

async function testConnection() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Simple query
    console.log('\n✅ Testing basic connection...');
    const { data, error } = await supabase
      .from('vendors')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.log('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Basic connection works!');

    // Test 2: Insert test
    console.log('\n✅ Testing insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('vendors')
      .insert({
        name: 'TEST CONNECTION',
        contact_email: `test-${Date.now()}@example.com`,
        contact_phone: '555-1234',
        product_type: 'produce',
        api_consent: true,
        payment_method: 'cash',
        available_dates: []
      })
      .select();

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      console.log('Full error:', insertError);
    } else {
      console.log('✅ Insert works! Created vendor:', insertData[0].id);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testConnection(); 