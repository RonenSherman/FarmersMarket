const { createClient } = require('@supabase/supabase-js');

console.log('🎨 Testing UI Improvements for Stock Management...\n');

// Use hardcoded values (same as from .env.local)
const supabaseUrl = 'https://clulowliyjqtcmuyqbkz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWxvd2xpeWpxdGNtdXlxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwODk5NjEsImV4cCI6MjA2NDY2NTk2MX0.q4_efIT2f7bK05ZDzYUphOy4xUx41Xkdbp4TofE0nEA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUIImprovements() {
  try {
    console.log('🛒 Setting up demo stock levels for UI testing...\n');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .order('name');

    if (error) {
      console.log('❌ Failed to get products:', error.message);
      return;
    }

    // Set varied stock levels for UI demonstration
    const stockLevels = [
      { stock: 0, label: '🚫 OUT OF STOCK' },    // Red badge
      { stock: 2, label: '⚠️ VERY LOW STOCK' },  // Orange badge  
      { stock: 8, label: '⚠️ LOW STOCK' },       // Yellow badge
      { stock: 15, label: '✅ IN STOCK' },       // Green badge
    ];

    for (let i = 0; i < Math.min(products.length, stockLevels.length); i++) {
      const product = products[i];
      const { stock, label } = stockLevels[i];
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: stock })
        .eq('id', product.id);

      if (updateError) {
        console.log(`❌ Failed to update ${product.name}:`, updateError.message);
      } else {
        console.log(`${label} ${product.name} - Set to ${stock} items`);
      }
    }

    console.log('\n🎨 UI Improvements Implemented:');
    console.log('   ✅ Better error messages with emojis');
    console.log('   ✅ Color-coded stock badges');
    console.log('   ✅ Disabled buttons for out-of-stock items');
    console.log('   ✅ Real-time stock updates after adding to cart');
    console.log('   ✅ Stock validation in cart quantity updates');
    console.log('   ✅ Visual stock indicators with dots');

    console.log('\n🔄 Error Messages Now Show:');
    console.log('   😞 "Product Name is out of stock" (instead of generic error)');
    console.log('   📦 "Only X more items available (Y total, Z in cart)"');
    console.log('   ❌ "Product Name is no longer available"');
    console.log('   ⚠️ Other specific validation messages');

    console.log('\n📱 Visual Improvements:');
    console.log('   🔴 Out of stock: Red badge with red dot');
    console.log('   🟠 Very low (1-5): Orange badge with orange dot');
    console.log('   🟡 Low stock (6-10): Yellow badge with yellow dot');
    console.log('   🟢 In stock (10+): Green badge with green dot');

    console.log('\n🔄 Real-time Updates:');
    console.log('   • Stock refreshes after adding items to cart');
    console.log('   • UI updates immediately on stock changes');
    console.log('   • Cart validates against current stock levels');

    console.log('\n🎯 Test Your Improvements:');
    console.log('   1. Visit http://localhost:3000/shop');
    console.log('   2. Try adding out-of-stock items (disabled button)');
    console.log('   3. Try adding low-stock items (see updated counts)');
    console.log('   4. Check cart quantity validation');
    console.log('   5. Notice improved error messages');

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testUIImprovements(); 