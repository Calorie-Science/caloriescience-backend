const axios = require('axios');

async function testOptimizedMealPlanPreview() {
  try {
    console.log('🧪 Testing optimized meal plan preview response structure...');
    
    const response = await axios.post('https://caloriescience-api.vercel.app/api/meal-plans', {
      action: 'preview',
      clientId: 'b543f1f8-87f9-4d84-835e-78385546321a',
      planDate: '2025-09-15',
      dietaryRestrictions: [],
      cuisinePreferences: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE'
      }
    });

    console.log('✅ Response received successfully');
    
    const mealPlan = response.data.data.mealPlan;
    
    // Check response structure
    console.log('\n📊 RESPONSE STRUCTURE ANALYSIS:');
    console.log('================================');
    
    // Check if dailyNutrition is populated
    if (mealPlan.dailyNutrition) {
      console.log('✅ Daily Nutrition found:');
      console.log(`  - Total Calories: ${mealPlan.dailyNutrition.totalCalories}`);
      console.log(`  - Total Protein: ${mealPlan.dailyNutrition.totalProtein}g`);
      console.log(`  - Total Carbs: ${mealPlan.dailyNutrition.totalCarbs}g`);
      console.log(`  - Total Fat: ${mealPlan.dailyNutrition.totalFat}g`);
      console.log(`  - Total Fiber: ${mealPlan.dailyNutrition.totalFiber}g`);
      console.log(`  - Total Sodium: ${mealPlan.dailyNutrition.totalSodium}g`);
      console.log(`  - Total Sugar: ${mealPlan.dailyNutrition.totalSugar}g`);
    } else {
      console.log('❌ No dailyNutrition object found');
    }
    
    // Check meals structure
    console.log(`\n🍽️  Meals Analysis (${mealPlan.meals.length} meals):`);
    mealPlan.meals.forEach((meal, index) => {
      console.log(`\n  Meal ${index + 1}: ${meal.mealName}`);
      console.log(`    - Meal Time: ${meal.mealTime}`);
      console.log(`    - Target Calories: ${meal.targetCalories}`);
      console.log(`    - Has Recipe: ${!!meal.recipe}`);
      
      if (meal.recipe) {
        console.log(`    - Recipe ID: ${meal.recipe.id}`);
        console.log(`    - Recipe Name: ${meal.recipe.name}`);
        console.log(`    - Recipe Image: ${meal.recipe.image ? 'Yes' : 'No'}`);
        console.log(`    - Recipe URL: ${meal.recipe.url ? 'Yes' : 'No'}`);
        console.log(`    - Servings: ${meal.recipe.servings}`);
        console.log(`    - Prep Time: ${meal.recipe.prepTime} minutes`);
        
        // Check nutrition structure
        if (meal.recipe.nutrition) {
          console.log(`    - Nutrition per serving:`);
          console.log(`      * Calories: ${meal.recipe.nutrition.calories}`);
          console.log(`      * Protein: ${meal.recipe.nutrition.protein}g`);
          console.log(`      * Carbs: ${meal.recipe.nutrition.carbs}g`);
          console.log(`      * Fat: ${meal.recipe.nutrition.fat}g`);
          console.log(`      * Fiber: ${meal.recipe.nutrition.fiber}g`);
          console.log(`      * Sodium: ${meal.recipe.nutrition.sodium}g`);
          console.log(`      * Sugar: ${meal.recipe.nutrition.sugar}g`);
        } else {
          console.log(`    - ❌ No nutrition data`);
        }
        
        // Check ingredients structure
        if (meal.recipe.ingredients && meal.recipe.ingredients.length > 0) {
          console.log(`    - Ingredients (${meal.recipe.ingredients.length}):`);
          meal.recipe.ingredients.slice(0, 3).forEach((ingredient, i) => {
            console.log(`      ${i + 1}. ${ingredient.text}`);
          });
          if (meal.recipe.ingredients.length > 3) {
            console.log(`      ... and ${meal.recipe.ingredients.length - 3} more`);
          }
        } else {
          console.log(`    - ❌ No ingredients`);
        }
        
        // Check dietary information
        if (meal.recipe.dietLabels && meal.recipe.dietLabels.length > 0) {
          console.log(`    - Diet Labels: ${meal.recipe.dietLabels.join(', ')}`);
        }
        if (meal.recipe.healthLabels && meal.recipe.healthLabels.length > 0) {
          console.log(`    - Health Labels: ${meal.recipe.healthLabels.join(', ')}`);
        }
      }
    });
    
    // Check for any remaining nested structures
    console.log('\n🔍 CHECKING FOR NESTED STRUCTURES:');
    const checkNested = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (key === 'details' || key === 'recipe' && path.includes('recipe')) {
            console.log(`⚠️  Found potentially nested structure: ${currentPath}`);
          }
          checkNested(value, currentPath);
        }
      }
    };
    
    checkNested(mealPlan);
    
    // Calculate response size
    const responseSize = JSON.stringify(response.data).length;
    console.log(`\n📏 Response Size: ${(responseSize / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ Optimized meal plan preview test completed!');
    
  } catch (error) {
    console.error('❌ Error testing optimized meal plan preview:', error.response?.data || error.message);
  }
}

testOptimizedMealPlanPreview();
