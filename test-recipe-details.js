const fetch = require('node-fetch');

// Edamam credentials
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test fetching recipe details directly
async function testRecipeDetails() {
  console.log('🧪 Testing Edamam Recipe API directly...\n');

  // Recipe URI from our test
  const recipeUri = 'http://www.edamam.com/ontologies/edamam.owl#recipe_add4d895442c6c8f53accb8c17fd2cfb';
  
  // Extract recipe ID from URI
  const recipeId = recipeUri.split('#recipe_')[1];
  console.log('Recipe URI:', recipeUri);
  console.log('Recipe ID:', recipeId);

  // Test Recipe API v2
  const url = `https://api.edamam.com/api/recipes/v2/${recipeId}?app_id=${APP_ID}&app_key=${APP_KEY}&type=public`;
  console.log('Recipe API URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('\nResponse Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Recipe details:', JSON.stringify(data, null, 2));
      
      // Check if we have the expected fields
      if (data.recipe) {
        console.log('\n🔍 Recipe fields found:');
        console.log('Label:', data.recipe.label);
        console.log('URL:', data.recipe.url);
        console.log('Image:', data.recipe.image);
        console.log('Calories:', data.recipe.calories);
        console.log('Yield:', data.recipe.yield);
        console.log('Ingredients:', data.recipe.ingredientLines?.length || 0);
        
        if (data.recipe.totalNutrients) {
          console.log('Protein:', data.recipe.totalNutrients.PROCNT?.quantity, data.recipe.totalNutrients.PROCNT?.unit);
          console.log('Carbs:', data.recipe.totalNutrients.CHOCDF?.quantity, data.recipe.totalNutrients.CHOCDF?.unit);
          console.log('Fat:', data.recipe.totalNutrients.FAT?.quantity, data.recipe.totalNutrients.FAT?.unit);
          console.log('Fiber:', data.recipe.totalNutrients.FIBTG?.quantity, data.recipe.totalNutrients.FIBTG?.unit);
        }
      }
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }
}

testRecipeDetails().catch(console.error);
