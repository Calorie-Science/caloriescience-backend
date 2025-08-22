const fetch = require('node-fetch');

const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';
const USER_ID = 'nutritionist1';

async function testMealPlanningDebug() {
  console.log('🔍 Testing the exact Edamam API calls from meal planning service...\n');

  // Test the exact parameters that the meal planning service uses for breakfast
  const breakfastParams = {
    dishType: ['main course'],
    calories: '285-854', // 0.5x to 1.5x of 569 calories
    time: '0-60',
    imageSize: 'REGULAR',
    random: 'true',
    query: 'eggs',
    health: ['alcohol-free']
  };

  console.log('🍳 Testing Breakfast Recipe Search:');
  console.log('Parameters:', JSON.stringify(breakfastParams, null, 2));
  
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('app_id', APP_ID);
    searchParams.append('app_key', APP_KEY);
    searchParams.append('type', 'public');
    
    // Add all parameters exactly as the service does
    Object.entries(breakfastParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    });

    console.log('\n🔗 Full URL:', `https://api.edamam.com/api/recipes/v2?${searchParams.toString()}`);

    const response = await fetch(`https://api.edamam.com/api/recipes/v2?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Edamam-Account-User': USER_ID
      }
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Hits: ${data.hits?.length || 0}`);
    
    if (data.hits && data.hits.length > 0) {
      console.log('\n📝 First 3 recipes:');
      data.hits.slice(0, 3).forEach((hit, index) => {
        const recipe = hit.recipe;
        console.log(`\n${index + 1}. ${recipe.label}`);
        console.log(`   Calories: ${recipe.calories}`);
        console.log(`   URL: ${recipe.url}`);
        
        // Check if it's a beverage/cocktail
        const isBeverage = recipe.label.toLowerCase().includes('cocktail') || 
                          recipe.label.toLowerCase().includes('drink') ||
                          recipe.label.toLowerCase().includes('sour') ||
                          recipe.label.toLowerCase().includes('vodka') ||
                          recipe.label.toLowerCase().includes('rum');
        
        if (isBeverage) {
          console.log('   ⚠️  WARNING: This appears to be a beverage/cocktail!');
        } else {
          console.log('   ✅ This appears to be food!');
        }
      });
    } else {
      console.log('❌ No hits found - this explains why we get placeholder meals!');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  
  // Test with simpler parameters to see if the issue is with our filters
  console.log('\n🧪 Testing with simpler parameters (no dishType or health filters):');
  
  const simpleParams = {
    calories: '285-854',
    time: '0-60',
    imageSize: 'REGULAR',
    random: 'true',
    query: 'eggs'
  };

  try {
    const searchParams = new URLSearchParams();
    searchParams.append('app_id', APP_ID);
    searchParams.append('app_key', APP_KEY);
    searchParams.append('type', 'public');
    
    Object.entries(simpleParams).forEach(([key, value]) => {
      searchParams.append(key, value);
    });

    const response = await fetch(`https://api.edamam.com/api/recipes/v2?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Edamam-Account-User': USER_ID
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Simple search hits: ${data.hits?.length || 0}`);
      
      if (data.hits && data.hits.length > 0) {
        const firstRecipe = data.hits[0].recipe;
        console.log(`📝 First recipe: ${firstRecipe.label}`);
        console.log(`🍽️  Calories: ${firstRecipe.calories}`);
      }
    }
  } catch (error) {
    console.log(`❌ Simple search error: ${error.message}`);
  }
}

testMealPlanningDebug().catch(console.error);
