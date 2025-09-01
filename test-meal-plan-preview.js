const axios = require('axios');

async function testMealPlanPreview() {
  try {
    console.log('🧪 Testing meal plan preview with dailyNutrition calculation...');
    
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
    
    // Check if dailyNutrition is populated
    if (mealPlan.dailyNutrition) {
      console.log('🎯 Daily Nutrition Totals:');
      console.log(`  - Total Calories: ${mealPlan.dailyNutrition.totalCalories}`);
      console.log(`  - Total Protein: ${mealPlan.dailyNutrition.totalProtein}g`);
      console.log(`  - Total Carbs: ${mealPlan.dailyNutrition.totalCarbs}g`);
      console.log(`  - Total Fat: ${mealPlan.dailyNutrition.totalFat}g`);
      console.log(`  - Total Fiber: ${mealPlan.dailyNutrition.totalFiber}g`);
      
      // Check if totals are non-zero
      if (mealPlan.dailyNutrition.totalCalories > 0) {
        console.log('✅ SUCCESS: Daily nutrition totals are now populated!');
      } else {
        console.log('❌ FAILED: Daily nutrition totals are still zero');
      }
    } else {
      console.log('❌ FAILED: No dailyNutrition object found in response');
    }
    
    // Check if all meals have recipes
    const mealsWithRecipes = mealPlan.meals.filter(meal => meal.recipe && meal.recipe.details);
    console.log(`📊 Meals with recipes: ${mealsWithRecipes.length}/${mealPlan.meals.length}`);
    
    if (mealsWithRecipes.length === mealPlan.meals.length) {
      console.log('✅ SUCCESS: All meals have recipes!');
    } else {
      console.log('❌ FAILED: Some meals are missing recipes');
    }
    
  } catch (error) {
    console.error('❌ Error testing meal plan preview:', error.response?.data || error.message);
  }
}

testMealPlanPreview();
