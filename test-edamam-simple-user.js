const fetch = require('node-fetch');

async function testEdamamSimpleUser() {
  const appId = '5bce8081';
  const appKey = 'c80ecbf8968d48dfe51d395f6f19279a';
  const simpleUserId = 'nutritionist1';
  
  const searchParams = new URLSearchParams();
  searchParams.append('app_id', appId);
  searchParams.append('app_key', appKey);
  searchParams.append('type', 'public');
  searchParams.append('q', 'breakfast');
  searchParams.append('mealType', 'breakfast');
  
  const url = `https://api.edamam.com/api/recipes/v2?${searchParams.toString()}`;
  
  console.log('🔍 Testing Edamam API with Simple User ID');
  console.log('URL:', url);
  console.log('Simple User ID:', simpleUserId);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Edamam-Account-User': simpleUserId
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Hits count:', data.hits?.length || 0);
      if (data.hits && data.hits.length > 0) {
        console.log('First recipe:', data.hits[0].recipe.label);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEdamamSimpleUser();
