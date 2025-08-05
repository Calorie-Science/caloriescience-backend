const http = require('http');

function testWithTimeout() {
  console.log('🧪 Quick test of EER API...');
  
  const postData = JSON.stringify({
    country: 'India',
    age: 30,
    sex: 'male',
    weight_kg: 70,
    height_cm: 175,
    activity_level: 'moderately_active'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/eer-calculate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 30000 // 30 second timeout
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Response received!');
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });

  req.on('timeout', () => {
    console.log('⏰ Request timed out after 30 seconds');
    req.destroy();
  });

  req.on('error', (error) => {
    console.log('❌ Error:', error.message);
  });

  req.write(postData);
  req.end();
}

// Test server availability first
console.log('🔍 Checking if server is running...');
const healthCheck = http.get('http://localhost:3000/', (res) => {
  console.log('✅ Server is responding');
  testWithTimeout();
}).on('error', (err) => {
  console.log('❌ Server not responding:', err.message);
});

healthCheck.setTimeout(5000, () => {
  console.log('⏰ Health check timed out - server might be starting up');
  healthCheck.destroy();
  console.log('🔄 Trying EER test anyway...');
  testWithTimeout();
}); 