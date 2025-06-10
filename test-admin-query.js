const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Admin Query that causes 401 error...\n');

// Use hardcoded values (same as from .env.local)
const supabaseUrl = 'https://clulowliyjqtcmuyqbkz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWxvd2xpeWpxdGNtdXlxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwODk5NjEsImV4cCI6MjA2NDY2NTk2MX0.q4_efIT2f7bK05ZDzYUphOy4xUx41Xkdbp4TofE0nEA';

console.log('Using URL:', supabaseUrl);
console.log('Using Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminQuery() {
  try {
    console.log('\n1️⃣ Testing the exact query from admin page...\n');
    
    // This is the exact query from productService.getAll() that's failing
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendors (
          id,
          name,
          contact_email,
          product_type,
          payment_method
        )
      `)
      .eq('available', true)
      .order('name');

    if (error) {
      console.log('❌ ADMIN QUERY FAILED:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
      console.log('\n🔧 This is the 401 error you see in admin!');
    } else {
      console.log('✅ Admin query successful!');
      console.log('   Found', data.length, 'products with vendor info');
      if (data.length > 0) {
        console.log('   First product:', data[0].name, 'from vendor:', data[0].vendors?.name);
      }
    }

    console.log('\n2️⃣ Testing simpler products query...\n');
    
    // Test simpler query without JOIN
    const { data: simpleData, error: simpleError } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('name');

    if (simpleError) {
      console.log('❌ Simple query failed:', simpleError.message);
    } else {
      console.log('✅ Simple query successful!');
      console.log('   Found', simpleData.length, 'products (no vendor info)');
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testAdminQuery(); 