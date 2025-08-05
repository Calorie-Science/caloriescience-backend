const http = require('http');

const testData = {
  country: 'India',
  age: 30,
  sex: 'male',
  weight_kg: 70,
  height_cm: 175,
  activity_level: 'moderately_active',
  health_goals: ['Weight Loss'],
  medical_conditions: []
};

function testEERCalculation() {
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/eer-calculate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 Testing EER calculation...');
  console.log('📤 Request data:', testData);
  console.log('🌐 Calling: http://localhost:3001/api/eer-calculate');

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`\n📡 Status: ${res.statusCode}`);
      
      try {
        const response = JSON.parse(responseData);
        
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS! EER calculation worked!');
          console.log('\n📊 Response:');
          console.log(JSON.stringify(response, null, 2));
        } else {
          console.log('❌ ERROR! EER calculation failed');
          console.log('Error response:', JSON.stringify(response, null, 2));
        }
      } catch (error) {
        console.log('❌ Failed to parse JSON response');
        console.log('Raw response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused. Is the server running?');
      console.log('💡 Make sure you started: vercel dev --listen 3001');
    } else {
      console.log('❌ Request error:', error.message);
    }
  });

  req.write(postData);
  req.end();
}

// Wait a bit for server to start, then test
setTimeout(() => {
  testEERCalculation();
}, 3000); 