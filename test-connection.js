const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase Connection...\n');

// Direct test with hardcoded values
const supabaseUrl = 'https://clulowliyjqtcmuyqbkz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWxvd2xpeWpxdGNtdXlxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwODk5NjEsImV4cCI6MjA2NDY2NTk2MX0.q4_efIT2f7bK05ZDzYUphOy4xUx41Xkdbp4TofE0nEA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('📡 Testing connection to:', supabaseUrl);
    console.log('🔑 Using key starting with:', supabaseKey.substring(0, 20) + '...\n');

    // Test 1: Simple health check
    console.log('1️⃣ Testing basic connectivity...');
    const { data, error } = await supabase
      .from('vendors')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Connection failed with error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log('✅ Connection successful!');
      console.log('   Result:', data);
    }

    // Test 2: Try to get products (the failing query from your admin)
    console.log('\n2️⃣ Testing products query (the one failing in admin)...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*, vendor:vendors(name, contact_email, product_type, payment_method)')
      .eq('available', true)
      .order('name');

    if (productError) {
      console.log('❌ Products query failed:', productError.message);
      console.log('   This is likely your 401 error source!');
      console.log('   Error details:', productError);
    } else {
      console.log('✅ Products query successful!');
      console.log('   Found', products.length, 'products');
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testConnection(); 