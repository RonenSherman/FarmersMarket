const https = require('https');

const testOAuthFix = async () => {
  const vendorId = 'b6a3eb4e-3bbb-4e35-a9b8-79f8ec4550c2';
  const provider = 'square';
  
  const postData = JSON.stringify({
    vendorId: vendorId,
    provider: provider
  });

  const options = {
    hostname: 'farmers-market-3ct4.vercel.app',
    path: '/api/test-oauth-fix',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', data);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('\n🔧 PARSED TEST RESULT:');
          console.log('====================');
          console.log(JSON.stringify(jsonData, null, 2));
          
          resolve(jsonData);
        } catch (e) {
          console.log('Failed to parse JSON:', e.message);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

console.log('🔧 Testing OAuth fix endpoint...');
testOAuthFix().then(result => {
  console.log('\n✅ Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
}); 