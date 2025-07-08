// Debug script to check Square connection after vendor setup
const baseUrl = 'https://farmers-market-3ct4.vercel.app';

async function debugSquareConnection(vendorId) {
  console.log('🔍 Debugging Square connection for vendor:', vendorId);
  console.log('');

  try {
    // Step 1: Check if the oauth/config endpoint can find the vendor
    console.log('1️⃣ Testing oauth/config endpoint...');
    const configResponse = await fetch(`${baseUrl}/api/oauth/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vendorId: vendorId,
        provider: 'square'
      })
    });

    console.log('   Status:', configResponse.status);
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('   ✅ Success! Config returned:', {
        applicationId: configData.applicationId?.substring(0, 20) + '...',
        locationId: configData.locationId?.substring(0, 20) + '...',
        environment: configData.environment
      });
      console.log('   → Square connection is working properly');
    } else {
      const errorData = await configResponse.json();
      console.log('   ❌ Error:', errorData.error);
      
      if (errorData.error === 'Vendor not found') {
        console.log('   → The vendor ID does not exist in the database');
        return;
      } else if (errorData.error.includes('data inconsistency')) {
        console.log('   → Found data inconsistency - vendor says connected but no connection record');
        console.log('   → This should have reset the vendor payment status');
      } else if (errorData.error.includes('No active payment connection')) {
        console.log('   → Vendor exists but has no payment connection set up');
      }
    }

    console.log('');

    // Step 2: Test the checkout page behavior
    console.log('2️⃣ Testing checkout page...');
    const checkoutResponse = await fetch(`${baseUrl}/checkout/${vendorId}`);
    console.log('   Checkout page status:', checkoutResponse.status);
    
    if (checkoutResponse.ok) {
      console.log('   ✅ Checkout page loads');
      console.log('   → Check browser for Square widget behavior');
    } else {
      console.log('   ❌ Checkout page failed to load');
    }

    console.log('');

    // Step 3: Provide debugging information
    console.log('3️⃣ Debugging checklist:');
    console.log('');
    console.log('   To verify the vendor setup:');
    console.log('   1. Check admin panel - does vendor show as having Square connected?');
    console.log('   2. Look at browser network tab when loading checkout page');
    console.log('   3. Check browser console for Square widget errors');
    console.log('');
    console.log('   If vendor shows as connected but widget fails:');
    console.log('   - There might be a delay between Square OAuth and database sync');
    console.log('   - The payment_connections table might be missing the record');
    console.log('   - The connection_status might not be "active"');
    console.log('');
    console.log('   Solutions:');
    console.log('   1. Wait 30 seconds and try the checkout page again');
    console.log('   2. Re-connect Square through admin panel');
    console.log('   3. Contact support if issue persists');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Test with a vendor ID - replace with the actual vendor ID you're testing
const testVendorId = process.argv[2] || 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2';

console.log('🚀 Square Connection Debug Tool');
console.log('='.repeat(50));
console.log('');

debugSquareConnection(testVendorId).catch(console.error); 