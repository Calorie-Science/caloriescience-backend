/**
 * Test script to demonstrate the measurement system functionality
 * 
 * This script shows how the measurement system conversion and formatting works
 * with sample nutrition data.
 */

const { 
  convertWeight, 
  convertVolume, 
  formatDateDDMonYYYY,
  getDefaultMeasurementSystem 
} = require('./lib/measurementSystem');

const { 
  formatNutritionData, 
  formatIngredient, 
  formatPhysicalMeasurements,
  formatGoals 
} = require('./lib/nutritionDisplayUtils');

console.log('🧪 Testing Measurement System Functionality\n');

// Test basic conversions
console.log('📏 Basic Conversions:');
console.log('100g → Imperial:', convertWeight(100, 'g', 'imperial'));
console.log('70 kg → Imperial:', convertWeight(70, 'kg', 'imperial'));
console.log('250 ml → Imperial:', convertVolume(250, 'ml', 'imperial'));
console.log('1 cup → Metric:', convertVolume(1, 'cup', 'metric'));
console.log('');

// Test date formatting
console.log('📅 Date Formatting:');
console.log('2025-09-15 → DD-MON-YYYY:', formatDateDDMonYYYY('2025-09-15'));
console.log('Today → DD-MON-YYYY:', formatDateDDMonYYYY(new Date()));
console.log('');

// Test default system detection
console.log('🌍 Default System Detection:');
console.log('USA → System:', getDefaultMeasurementSystem('USA'));
console.log('UK → System:', getDefaultMeasurementSystem('UK'));
console.log('India → System:', getDefaultMeasurementSystem('India'));
console.log('');

// Test nutrition data formatting
console.log('🍎 Nutrition Data Formatting:');
const sampleNutrition = {
  calories: 350,
  protein: 25.5,
  carbs: 45.2,
  fat: 12.8,
  fiber: 8.5,
  sodium: 650
};

const metricNutrition = formatNutritionData(sampleNutrition, 'metric');
const imperialNutrition = formatNutritionData(sampleNutrition, 'imperial');

console.log('Metric format:', JSON.stringify(metricNutrition, null, 2));
console.log('Imperial format:', JSON.stringify(imperialNutrition, null, 2));
console.log('');

// Test ingredient formatting
console.log('🥗 Ingredient Formatting:');
const sampleIngredient = {
  text: '200g chicken breast',
  quantity: 200,
  measure: 'g',
  food: 'chicken breast',
  weight: 200
};

const metricIngredient = formatIngredient(sampleIngredient, 'metric');
const imperialIngredient = formatIngredient(sampleIngredient, 'imperial');

console.log('Metric ingredient:', JSON.stringify(metricIngredient, null, 2));
console.log('Imperial ingredient:', JSON.stringify(imperialIngredient, null, 2));
console.log('');

// Test physical measurements
console.log('📊 Physical Measurements:');
const sampleClient = {
  height_cm: 175,
  weight_kg: 70,
  target_weight_kg: 65,
  bmi: 22.9
};

const metricMeasurements = formatPhysicalMeasurements(sampleClient, 'metric');
const imperialMeasurements = formatPhysicalMeasurements(sampleClient, 'imperial');

console.log('Metric measurements:', JSON.stringify(metricMeasurements, null, 2));
console.log('Imperial measurements:', JSON.stringify(imperialMeasurements, null, 2));
console.log('');

// Test goal formatting
console.log('🎯 Goal Formatting:');
const sampleGoals = {
  eer_goal_calories: 2200,
  protein_goal_min: 80,
  protein_goal_max: 120,
  carbs_goal_min: 200,
  carbs_goal_max: 300,
  fat_goal_min: 60,
  fat_goal_max: 90,
  fiber_goal_grams: 25,
  water_goal_liters: 2.5
};

const metricGoals = formatGoals(sampleGoals, 'metric');
const imperialGoals = formatGoals(sampleGoals, 'imperial');

console.log('Metric goals:', JSON.stringify(metricGoals, null, 2));
console.log('Imperial goals:', JSON.stringify(imperialGoals, null, 2));
console.log('');

// Test meal plan data
console.log('🍽️ Complete Meal Plan Formatting:');
const sampleMealPlan = {
  client: sampleClient,
  goals: sampleGoals,
  meals: [
    {
      name: 'Breakfast',
      nutrition: sampleNutrition,
      ingredients: [
        sampleIngredient,
        {
          text: '1 cup oatmeal',
          quantity: 1,
          measure: 'cup',
          food: 'oatmeal',
          weight: 80
        }
      ]
    }
  ],
  created_at: '2025-09-22T10:30:00Z'
};

console.log('Sample meal plan structure:');
console.log('- Client measurements in both systems');
console.log('- Goals in both systems');
console.log('- Meal nutrition in both systems');
console.log('- Ingredients converted appropriately');
console.log('- Dates formatted as DD-MON-YYYY');
console.log('');

console.log('✅ All measurement system tests completed!');
console.log('');
console.log('🚀 Ready for integration with:');
console.log('• API endpoints (/api/measurement-system)');
console.log('• Session management');
console.log('• Frontend toggle components');
console.log('• Database migrations');
console.log('');
console.log('📚 See MEASUREMENT_SYSTEM_FEATURE.md for full documentation');
