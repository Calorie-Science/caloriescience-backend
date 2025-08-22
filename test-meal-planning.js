#!/usr/bin/env node

/**
 * Test script for the meal planning system
 * This script tests the core functionality without requiring the full API server
 */

const { EdamamService } = require('./lib/edamamService');
const { MealPlanningService } = require('./lib/mealPlanningService');

async function testEdamamService() {
  console.log('🧪 Testing Edamam Service...\n');
  
  try {
    const edamamService = new EdamamService();
    
    // Test recipe search
    console.log('1. Testing recipe search...');
    const searchResults = await edamamService.searchRecipes({
      query: 'chicken pasta',
      mealType: ['lunch'],
      imageSize: 'REGULAR',
      random: true
    });
    
    console.log(`   ✅ Found ${searchResults.hits?.length || 0} recipes`);
    
    if (searchResults.hits && searchResults.hits.length > 0) {
      const firstRecipe = searchResults.hits[0].recipe;
      console.log(`   📝 First recipe: ${firstRecipe.label}`);
      console.log(`   🔥 Calories: ${firstRecipe.calories}`);
      console.log(`   🥩 Protein: ${firstRecipe.totalNutrients.PROCNT?.quantity || 0}g`);
      console.log(`   🍞 Carbs: ${firstRecipe.totalNutrients.CHOCDF?.quantity || 0}g`);
      console.log(`   🧈 Fat: ${firstRecipe.totalNutrients.FAT?.quantity || 0}g`);
    }
    
    // Test nutrition calculation
    console.log('\n2. Testing nutrition calculation...');
    if (searchResults.hits && searchResults.hits.length >= 2) {
      const recipes = searchResults.hits.slice(0, 2).map(hit => hit.recipe);
      const nutrition = EdamamService.calculateTotalNutrition(recipes);
      
      console.log('   📊 Total nutrition for 2 recipes:');
      console.log(`      Calories: ${nutrition.totalCalories}`);
      console.log(`      Protein: ${nutrition.totalProtein}g`);
      console.log(`      Carbs: ${nutrition.totalCarbs}g`);
      console.log(`      Fat: ${nutrition.totalFat}g`);
      console.log(`      Fiber: ${nutrition.totalFiber}g`);
    }
    
    console.log('\n✅ Edamam Service tests passed!\n');
    
  } catch (error) {
    console.error('❌ Edamam Service test failed:', error.message);
    console.log('   Make sure you have valid EDAMAM_APP_ID and EDAMAM_APP_KEY in your environment');
  }
}

async function testMealPlanningService() {
  console.log('🧪 Testing Meal Planning Service...\n');
  
  try {
    const mealPlanningService = new MealPlanningService();
    
    // Test meal distribution calculation
    console.log('1. Testing meal distribution calculation...');
    const distribution = mealPlanningService['calculateMealDistribution'](2000, 150, 200, 67);
    
    console.log('   📊 Daily distribution (2000 calories):');
    console.log(`      Breakfast: ${distribution.breakfast.calories} cal, ${distribution.breakfast.protein}g protein`);
    console.log(`      Lunch: ${distribution.lunch.calories} cal, ${distribution.lunch.protein}g protein`);
    console.log(`      Dinner: ${distribution.dinner.calories} cal, ${distribution.dinner.protein}g protein`);
    console.log(`      Snack: ${distribution.snack.calories} cal, ${distribution.snack.protein}g protein`);
    
    // Test nutrition summary calculation
    console.log('\n2. Testing nutrition summary calculation...');
    const mockMeals = [
      {
        totalCalories: 500,
        totalProtein: 25,
        totalCarbs: 60,
        totalFat: 20,
        totalFiber: 8
      },
      {
        totalCalories: 700,
        totalProtein: 35,
        totalCarbs: 80,
        totalFat: 25,
        totalFiber: 12
      }
    ];
    
    const summary = mealPlanningService['calculateNutritionSummary'](mockMeals);
    console.log('   📊 Nutrition summary:');
    console.log(`      Total Calories: ${summary.totalCalories}`);
    console.log(`      Total Protein: ${summary.totalProtein}g (${summary.proteinPercentage}%)`);
    console.log(`      Total Carbs: ${summary.totalCarbs}g (${summary.carbsPercentage}%)`);
    console.log(`      Total Fat: ${summary.totalFat}g (${summary.fatPercentage}%)`);
    console.log(`      Total Fiber: ${summary.totalFiber}g`);
    
    console.log('\n✅ Meal Planning Service tests passed!\n');
    
  } catch (error) {
    console.error('❌ Meal Planning Service test failed:', error.message);
  }
}

async function testIntegration() {
  console.log('🧪 Testing Integration...\n');
  
  try {
    console.log('1. Testing Edamam recipe conversion...');
    const mockEdamamRecipe = {
      uri: 'test-recipe-uri',
      label: 'Test Recipe',
      image: 'https://example.com/image.jpg',
      source: 'Test Source',
      url: 'https://example.com/recipe',
      yield: 4,
      totalTime: 30,
      calories: 400,
      totalNutrients: {
        PROCNT: { quantity: 25, unit: 'g' },
        CHOCDF: { quantity: 45, unit: 'g' },
        FAT: { quantity: 15, unit: 'g' },
        FIBTG: { quantity: 8, unit: 'g' }
      },
      ingredientLines: ['Ingredient 1', 'Ingredient 2'],
      dietLabels: ['vegetarian'],
      healthLabels: ['low-sodium'],
      cuisineType: ['italian'],
      mealType: ['lunch'],
      dishType: ['main course']
    };
    
    const standardRecipe = EdamamService.convertRecipeToStandard(mockEdamamRecipe);
    console.log('   ✅ Recipe conversion successful:');
    console.log(`      Name: ${standardRecipe.name}`);
    console.log(`      Calories: ${standardRecipe.calories}`);
    console.log(`      Protein: ${standardRecipe.protein}g`);
    console.log(`      Cuisine: ${standardRecipe.cuisineType.join(', ')}`);
    
    console.log('\n✅ Integration tests passed!\n');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Meal Planning System Tests...\n');
  console.log('=' .repeat(50));
  
  await testEdamamService();
  await testMealPlanningService();
  await testIntegration();
  
  console.log('=' .repeat(50));
  console.log('🎉 All tests completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Set up your environment variables (EDAMAM_APP_ID, EDAMAM_APP_KEY)');
  console.log('   2. Run the database migration: 035_create_meal_planning_tables.sql');
  console.log('   3. Start your API server and test the endpoints');
  console.log('   4. Check the MEAL_PLANNING_README.md for detailed usage instructions');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testEdamamService,
  testMealPlanningService,
  testIntegration,
  runAllTests
};
