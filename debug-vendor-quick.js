// Quick diagnostic script to test vendor payment connections
// Run this with: node debug-vendor-quick.js

const baseUrl = 'https://farmers-marketrs-6tnvluui9-ronen-shermans-projects.vercel.app';

async function testVendor(vendorId, description) {
    console.log(`\n🔍 Testing ${description} (${vendorId})`);
    console.log('═'.repeat(60));
    
    try {
        // Test debug endpoint
        const debugResponse = await fetch(`${baseUrl}/api/debug-vendor-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId })
        });
        
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('✅ Debug endpoint response:');
            console.log('   Vendor says connected:', debugData.diagnosis?.vendorSaysConnected);
            console.log('   Active connections:', debugData.diagnosis?.actualActiveConnections);
            console.log('   Has Square connection:', debugData.diagnosis?.hasSquareConnection);
            console.log('   Has ACTIVE Square connection:', debugData.diagnosis?.hasActiveSquareConnection);
            console.log('   Mismatch detected:', debugData.diagnosis?.mismatchDetected);
        } else {
            console.log('❌ Debug endpoint error:', debugResponse.status);
        }
        
        // Test OAuth config endpoint (same as Square widget)
        const oauthResponse = await fetch(`${baseUrl}/api/oauth/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId, provider: 'square' })
        });
        
        if (oauthResponse.ok) {
            const oauthData = await oauthResponse.json();
            console.log('✅ OAuth config success - Square widget would work!');
            console.log('   Application ID:', oauthData.applicationId ? 'Present' : 'Missing');
            console.log('   Location ID:', oauthData.locationId ? 'Present' : 'Missing');
        } else {
            console.log('❌ OAuth config error:', oauthResponse.status);
            const errorData = await oauthResponse.json();
            console.log('   Error:', errorData.error);
        }
        
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

async function main() {
    console.log('🚀 Vendor Payment Connection Diagnostic');
    console.log('Testing both vendor IDs to identify the issue...\n');
    
    // Test the failing vendor
    await testVendor('98d1d158-3988-4c27-a50d-81e278f11bc4', 'FAILING VENDOR (from Square widget logs)');
    
    // Test the known working vendor
    await testVendor('f2d49276-652f-4f5f-a8ec-286d7006ff01', 'KNOWN WORKING VENDOR (from OAuth success logs)');
    
    console.log('\n📋 Summary:');
    console.log('- If FAILING VENDOR shows "Mismatch detected: true" → Admin panel shows wrong info');
    console.log('- If FAILING VENDOR shows "Has Square connection: false" → Vendor never connected Square');
    console.log('- If KNOWN WORKING VENDOR shows OAuth success → Square widget works with this vendor');
    console.log('\n💡 Next steps:');
    console.log('1. Check which vendor you\'re testing the Square widget on');
    console.log('2. Make sure you\'re using the checkout page for the vendor with Square connected');
    console.log('3. Or connect Square to the vendor you want to test with');
}

main().catch(console.error); 