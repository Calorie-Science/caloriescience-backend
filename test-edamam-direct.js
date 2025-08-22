const fetch = require('node-fetch');

async function testEdamamDirect() {
  const appId = '5bce8081';
  const appKey = 'c80ecbf8968d48dfe51d395f6f19279a';
  const userId = 'fjf88e44-db97-494d-9a49-8cc91e716734';
  
  const searchParams = new URLSearchParams();
  searchParams.append('app_id', appId);
  searchParams.append('app_key', appKey);
  searchParams.append('type', 'public');
  searchParams.append('q', 'breakfast');
  searchParams.append('mealType', 'breakfast');
  
  const url = `https://api.edamam.com/api/recipes/v2?${searchParams.toString()}`;
  
  console.log('🔍 Testing Edamam API directly');
  console.log('URL:', url);
  console.log('User ID:', userId);
  
  try {
    // Test with Edamam-Account-User header
    console.log('\n🧪 Test 1: With Edamam-Account-User header');
    const response1 = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Edamam-Account-User': userId
      }
    });
    
    console.log('Status:', response1.status);
    console.log('Status Text:', response1.statusText);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Hits count:', data1.hits?.length || 0);
    } else {
      const errorText = await response1.text();
      console.log('Error response:', errorText);
    }
    
    // Test with lowercase header
    console.log('\n🧪 Test 2: With edamam-account-user header (lowercase)');
    const response2 = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'edamam-account-user': userId
      }
    });
    
    console.log('Status:', response2.status);
    console.log('Status Text:', response2.statusText);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Hits count:', data2.hits?.length || 0);
    } else {
      const errorText = await response2.text();
      console.log('Error response:', errorText);
    }
    
    // Test without header
    console.log('\n🧪 Test 3: Without user header');
    const response3 = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response3.status);
    console.log('Status Text:', response3.statusText);
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('Hits count:', data3.hits?.length || 0);
    } else {
      const errorText = await response3.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEdamamDirect();
