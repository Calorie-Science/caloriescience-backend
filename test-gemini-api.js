const https = require('https');

// Test data for Gemini meal plan generation
const testData = {
  type: 'meal-plan',
  action: 'async-generate',
  clientId: 'test-client-123',
  planDate: '2025-01-17',
  planType: 'daily',
  dietaryRestrictions: [],
  cuisinePreferences: ['indian', 'mediterranean'],
  mealPreferences: {},
  targetCalories: 2000,
  macroTargets: {
    protein: { min: 100, max: 150 },
    carbs: { min: 200, max: 300 },
    fat: { min: 60, max: 80 }
  },
  days: 1,
  startDate: '2025-01-17',
  additionalText: 'Focus on healthy breakfast and lunch meals. Prefer vegetarian options.',
  aiModel: 'gemini' // This is the key parameter for testing Gemini
};

// Mock client goals data
const clientGoals = {
  eerGoalCalories: 2000,
  proteinGoalMin: 100,
  proteinGoalMax: 150,
  carbsGoalMin: 200,
  carbsGoalMax: 300,
  fatGoalMin: 60,
  fatGoalMax: 80,
  fiberGoalGrams: 25,
  waterGoalLiters: 2.0,
  allergies: ['nuts'],
  preferences: ['vegetarian'],
  cuisineTypes: ['indian', 'mediterranean'],
  notes: 'Prefer simple, quick meals'
};

// Add client goals to test data
testData.overrideClientGoals = clientGoals;

console.log('🧪 Testing Gemini Integration via API...');
console.log('📝 Test data:', JSON.stringify(testData, null, 2));

// Note: This would need to be run against your actual API endpoint
// For example: https://your-app.vercel.app/api/meal-plans
console.log('\n📡 To test via URL, make a POST request to:');
console.log('   https://your-app.vercel.app/api/meal-plans');
console.log('\n📋 With the following JSON payload:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n🔑 Make sure to include proper authentication headers!');
