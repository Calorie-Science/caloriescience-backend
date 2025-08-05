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

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testAsyncEER() {
  console.log('🚀 Testing Async EER Calculation Workflow');
  console.log('==========================================');
  
  try {
    // Step 1: Start async calculation
    console.log('\n📤 Step 1: Starting async EER calculation...');
    const startOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/eer-calculate-async',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const startResponse = await makeRequest(startOptions, JSON.stringify(testData));
    console.log(`Status: ${startResponse.status}`);
    
    if (startResponse.status !== 202) {
      console.error('❌ Failed to start calculation:', startResponse.data);
      return;
    }

    console.log('✅ Calculation started!');
    console.log('Job ID:', startResponse.data.job_id);
    console.log('Status URL:', startResponse.data.check_status_url);
    console.log('Estimated completion:', startResponse.data.estimated_completion);

    const jobId = startResponse.data.job_id;

    // Step 2: Poll for status
    console.log('\n🔄 Step 2: Polling for completion...');
    
    let attempts = 0;
    let completed = false;
    
    while (!completed && attempts < 30) { // Max 30 attempts (60 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
      
      const statusOptions = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/eer-status/${jobId}`,
        method: 'GET'
      };

      const statusResponse = await makeRequest(statusOptions);
      
      if (statusResponse.status === 200) {
        const status = statusResponse.data;
        console.log(`[${attempts}] Status: ${status.status}`);
        
        if (status.status === 'completed') {
          console.log('\n🎉 Calculation completed!');
          console.log('=====================================');
          console.log('\n📊 EER Results:');
          console.log('- Region Rule:', status.result.region_rule_selected);
          console.log('- BMR Equation:', status.result.bmr_equation_used);
          console.log('- PAL Explanation:', status.result.pal_explanation);
          console.log('- Final EER:', status.result.final_eer_kcal, 'kcal');
          console.log('\n📋 Full Response:');
          console.log(JSON.stringify(status, null, 2));
          completed = true;
          
        } else if (status.status === 'failed') {
          console.log('\n❌ Calculation failed!');
          console.log('Error:', status.error);
          completed = true;
          
        } else {
          // Still processing
          console.log(`   - ${status.message || 'Processing...'}`);
          if (status.estimated_remaining) {
            console.log(`   - Estimated remaining: ${status.estimated_remaining}`);
          }
        }
      } else {
        console.log(`[${attempts}] Status check failed:`, statusResponse.status);
      }
    }

    if (!completed) {
      console.log('\n⏰ Timeout: Calculation did not complete within 60 seconds');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAsyncEER(); 