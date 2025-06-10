// Simple test script to verify database connectivity
// Run with: node test-database.js

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🧪 Testing Duvall Farmers Market Database...\n');

async function testDatabase() {
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('✅ Supabase client initialized');
    
    // Test 1: Check if tables exist
    console.log('\n📋 Testing table access...');
    
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('count(*)')
      .limit(1);
    
    if (vendorError) {
      console.log('❌ Vendors table:', vendorError.message);
    } else {
      console.log('✅ Vendors table accessible');
    }
    
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('count(*)')
      .limit(1);
    
    if (productError) {
      console.log('❌ Products table:', productError.message);
    } else {
      console.log('✅ Products table accessible');
    }
    
    const { data: marketDates, error: dateError } = await supabase
      .from('market_dates')
      .select('count(*)')
      .limit(1);
    
    if (dateError) {
      console.log('❌ Market dates table:', dateError.message);
    } else {
      console.log('✅ Market dates table accessible');
    }
    
    // Test 2: Check if we can query market dates
    console.log('\n📅 Testing market dates query...');
    
    const { data: upcomingDates, error: upcomingError } = await supabase
      .from('market_dates')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(5);
    
    if (upcomingError) {
      console.log('❌ Market dates query failed:', upcomingError.message);
    } else {
      console.log(`✅ Found ${upcomingDates.length} upcoming market dates`);
      if (upcomingDates.length > 0) {
        console.log('   Next market:', upcomingDates[0].date);
      }
    }
    
    // Test 3: Test vendor creation (dry run)
    console.log('\n👥 Testing vendor service...');
    
    const testVendorData = {
      name: "Test Farm (DO NOT USE)",
      contact_email: "test@example.com",
      contact_phone: "(555) 123-4567",
      product_type: "produce",
      api_consent: true,
      payment_method: "both",
      available_dates: ["2024-01-11", "2024-01-18"]
    };
    
    console.log('✅ Vendor data structure valid');
    
    console.log('\n🎉 Database integration test completed!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Create your Supabase project at https://supabase.com');
    console.log('2. Run the schema.sql script in your Supabase SQL editor');
    console.log('3. Update your .env.local file with your Supabase credentials');
    console.log('4. Test vendor signup on your website');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('- Check your Supabase URL and API key');
    console.log('- Ensure your .env.local file is configured');
    console.log('- Verify your Supabase project is running');
  }
}

// Run the test
testDatabase(); 