const axios = require('axios');

const BASE_URL = 'https://caloriescience-api.vercel.app/api/meal-plans';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NTc0OTI4ODIsImV4cCI6MTc1ODA5NzY4Mn0.1I5CzH9xXX5Fi15slA1jqusll1H9g4OSntTZVzYrfyk';
const PREVIEW_ID = '0d8dadfa-a16c-4f4a-9725-7f19f884af83';

async function testIngredientEditing() {
  try {
    console.log('🧪 Testing Ingredient Editing Mathematical Accuracy\n');

    // First, let's get the current meal plan to see the initial nutrition
    console.log('1. Getting current meal plan...');
    const getResponse = await axios.get(`${BASE_URL}/${PREVIEW_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const mealPlan = getResponse.data.data.mealPlan;
    console.log('✅ Meal plan retrieved successfully');
    console.log('📊 Initial Daily Nutrition:', mealPlan.dailyNutrition);

    // Let's look at the first meal (breakfast) and its ingredients
    const breakfast = mealPlan.meals.find(m => m.mealType === 'breakfast');
    if (!breakfast) {
      console.log('❌ No breakfast meal found');
      return;
    }

    console.log('\n2. Analyzing breakfast meal...');
    console.log('🍳 Breakfast Recipe:', breakfast.recipeName);
    console.log('📊 Breakfast Nutrition:', breakfast.recipe.nutritionSummary);
    console.log('🥘 Ingredients:');
    breakfast.recipe.ingredients.forEach((ing, index) => {
      console.log(`   ${index}: ${ing.text}`);
    });

    // Let's edit the first ingredient (rice flour) to something different
    const originalIngredient = breakfast.recipe.ingredients[0];
    const newIngredient = '2 cups all-purpose flour'; // Different ingredient

    console.log(`\n3. Editing ingredient: "${originalIngredient.text}" → "${newIngredient}"`);

    // Edit the ingredient
    const editResponse = await axios.post(BASE_URL, {
      type: 'meal-plan',
      action: 'multi-day-edit-ingredient',
      mealPlanId: PREVIEW_ID,
      previewId: PREVIEW_ID,
      dayNumber: 1,
      mealOrder: 1,
      ingredientIndex: 0,
      newIngredientText: newIngredient
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (editResponse.data.success) {
      console.log('✅ Ingredient edited successfully');
      
      const updatedMealPlan = editResponse.data.data.mealPlan;
      const updatedBreakfast = updatedMealPlan.meals.find(m => m.mealType === 'breakfast');
      
      console.log('\n4. Updated breakfast nutrition:');
      console.log('📊 Updated Breakfast Nutrition:', updatedBreakfast.recipe.nutritionSummary);
      console.log('📊 Updated Daily Nutrition:', updatedMealPlan.dailyNutrition);
      
      // Calculate the difference
      const originalCalories = breakfast.recipe.nutritionSummary.calories;
      const updatedCalories = updatedBreakfast.recipe.nutritionSummary.calories;
      const calorieDifference = updatedCalories - originalCalories;
      
      console.log('\n5. Mathematical Verification:');
      console.log(`📈 Original Calories: ${originalCalories}`);
      console.log(`📈 Updated Calories: ${updatedCalories}`);
      console.log(`📈 Net Change: ${calorieDifference}`);
      
      // Show the updated ingredients
      console.log('\n6. Updated ingredients:');
      updatedBreakfast.recipe.ingredients.forEach((ing, index) => {
        console.log(`   ${index}: ${ing.text}`);
      });
      
    } else {
      console.log('❌ Failed to edit ingredient:', editResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Error testing ingredient editing:', error.response?.data || error.message);
  }
}

// Run the test
testIngredientEditing();
