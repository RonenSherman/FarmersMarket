const https = require('https');

async function makeRequest(path, method = 'GET', data = null) {
  const postData = data ? JSON.stringify(data) : null;
  
  const options = {
    hostname: 'farmers-market-3ct4.vercel.app',
    path: path,
    method: method,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  if (postData) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          // For non-JSON responses (like HTML 404 pages)
          resolve({ status: res.statusCode, data: responseData, parseError: true });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testDeployment() {
  console.log('🔍 Testing Deployment Status\n');
  
  const tests = [
    {
      name: 'Database Diagnostic Endpoint',
      path: '/api/database-diagnostic',
      method: 'GET'
    },
    {
      name: 'OAuth Config Endpoint',
      path: '/api/oauth/config',
      method: 'GET'
    },
    {
      name: 'OAuth Config with Vendor (should show "Vendor not found")',
      path: '/api/oauth/config',
      method: 'POST',
      data: { vendorId: 'test-vendor-id', provider: 'square' }
    }
  ];

  for (const test of tests) {
    console.log(`📊 Testing: ${test.name}`);
    
    try {
      const result = await makeRequest(test.path, test.method, test.data);
      
      if (result.parseError) {
        if (result.status === 404) {
          console.log(`   ❌ Status: ${result.status} - Endpoint not deployed yet`);
        } else {
          console.log(`   ⚠️  Status: ${result.status} - Non-JSON response`);
        }
      } else {
        console.log(`   ✅ Status: ${result.status}`);
        
        if (test.name.includes('Database Diagnostic')) {
          if (result.data.diagnostics) {
            console.log(`      Total vendors: ${result.data.summary?.total_vendors || 0}`);
            console.log(`      Schema issues: ${result.data.summary?.schema_issues || 0}`);
            console.log(`      Data issues: ${result.data.summary?.data_issues || 0}`);
          } else {
            console.log(`      Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
          }
        } else if (test.name.includes('OAuth Config with Vendor')) {
          if (result.data.error) {
            console.log(`      Expected error: ${result.data.error}`);
          }
        } else if (test.name.includes('OAuth Config Endpoint')) {
          if (result.data.validation) {
            console.log(`      OAuth valid: ${result.data.validation.valid}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Summary:');
  console.log('   - Database diagnostic endpoint: Tests vendor schema and data');
  console.log('   - OAuth config endpoint: Confirms payment system is working');
  console.log('   - Vendor lookup: Should work once vendors exist and are approved');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Create vendors through admin panel or vendor signup');
  console.log('   2. Approve vendors through admin panel');
  console.log('   3. Test checkout functionality with real vendor IDs');
  console.log('   4. Apply database schema fix if needed');
}

testDeployment().catch(console.error); 