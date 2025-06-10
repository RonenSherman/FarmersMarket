const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Vendors Query that causes 401 error...\n');

// Use hardcoded values (same as from .env.local)
const supabaseUrl = 'https://clulowliyjqtcmuyqbkz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWxvd2xpeWpxdGNtdXlxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwODk5NjEsImV4cCI6MjA2NDY2NTk2MX0.q4_efIT2f7bK05ZDzYUphOy4xUx41Xkdbp4TofE0nEA';

console.log('Using URL:', supabaseUrl);
console.log('Using Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorsQuery() {
  try {
    console.log('\n1️⃣ Testing the exact vendors query that\'s failing...\n');
    
    // This is the exact query that's causing the 401 error
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.log('❌ VENDORS QUERY FAILED:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
      console.log('\n🔧 This is the 401 error you see for vendors!');
    } else {
      console.log('✅ Vendors query successful!');
      console.log('   Found', data.length, 'vendors');
      if (data.length > 0) {
        console.log('   First vendor:', data[0].name);
      }
    }

    console.log('\n2️⃣ Testing vendors count query...\n');
    
    // Test simpler query
    const { data: countData, error: countError } = await supabase
      .from('vendors')
      .select('count')
      .limit(1);

    if (countError) {
      console.log('❌ Vendors count query failed:', countError.message);
    } else {
      console.log('✅ Vendors count query successful!');
      console.log('   Result:', countData);
    }

    console.log('\n3️⃣ Testing from admin service (vendorService.getAll())...\n');
    
    // Test the exact service method used in admin
    const { data: adminData, error: adminError } = await supabase
      .from('vendors')
      .select('*')
      .order('name');

    if (adminError) {
      console.log('❌ Admin vendors service failed:', adminError.message);
      console.log('   This matches your admin error!');
    } else {
      console.log('✅ Admin vendors service successful!');
      console.log('   Found', adminData.length, 'vendors');
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testVendorsQuery(); 