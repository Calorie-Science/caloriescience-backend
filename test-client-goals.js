const fetch = require('node-fetch');

const API_BASE = 'https://caloriescience-api.vercel.app/api/meal-plans';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NTY4MjE2MiwiZXhwIjoxNzU2Mjg2OTYyfQ.nv1cD-JFf3mH8oChwMRR4S_Fff4cpzdJdJ2EVGn8kII';

const CLIENT_ID = 'b543f1f8-87f9-4d84-835e-78385546321a';

async function testClientGoals() {
  console.log('🎯 Testing Client Goals API\n');

  try {
    // 1. Create a client goal
    console.log('1️⃣ Creating client goal...');
    const createGoalResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        type: 'client-goal',
        clientId: CLIENT_ID,
        eerGoalCalories: 2200,
        bmrGoalCalories: 1800,
        proteinGoalGrams: 165,
        carbsGoalGrams: 220,
        fatGoalGrams: 73,
        proteinGoalPercentage: 30,
        carbsGoalPercentage: 40,
        fatGoalPercentage: 30,
        fiberGoalGrams: 25,
        waterGoalLiters: 2.5,
        notes: 'High protein diet for muscle building'
      })
    });

    const createGoalResult = await createGoalResponse.json();
    console.log('✅ Create Goal Response:', JSON.stringify(createGoalResult, null, 2));

    if (!createGoalResult.success) {
      throw new Error(`Failed to create client goal: ${createGoalResult.error}`);
    }

    // 2. Get client goals
    console.log('\n2️⃣ Fetching client goals...');
    const getGoalsResponse = await fetch(`${API_BASE}?clientId=${CLIENT_ID}&mode=client-goals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    const getGoalsResult = await getGoalsResponse.json();
    console.log('✅ Get Goals Response:', JSON.stringify(getGoalsResult, null, 2));

    // 3. Create a meal program with percentage distribution
    console.log('\n3️⃣ Creating meal program with percentage distribution...');
    const createProgramResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        type: 'meal-program',
        clientId: CLIENT_ID,
        name: 'High Protein 6-Meal Plan',
        description: 'A meal program designed for muscle building with frequent protein intake',
        meals: [
          {
            mealOrder: 1,
            mealName: 'Pre-Breakfast Protein',
            mealTime: '06:30',
            targetCalories: 200,
            mealType: 'snack',
            caloriePercentage: 9.1, // 200/2200 * 100
            proteinPercentage: 12, // Higher protein for morning
            carbsPercentage: 8,
            fatPercentage: 7
          },
          {
            mealOrder: 2,
            mealName: 'Breakfast',
            mealTime: '08:00',
            targetCalories: 500,
            mealType: 'breakfast',
            caloriePercentage: 22.7, // 500/2200 * 100
            proteinPercentage: 25,
            carbsPercentage: 23,
            fatPercentage: 20
          },
          {
            mealOrder: 3,
            mealName: 'Mid-Morning Snack',
            mealTime: '10:30',
            targetCalories: 250,
            mealType: 'snack',
            caloriePercentage: 11.4, // 250/2200 * 100
            proteinPercentage: 12,
            carbsPercentage: 11,
            fatPercentage: 10
          },
          {
            mealOrder: 4,
            mealName: 'Lunch',
            mealTime: '13:00',
            targetCalories: 600,
            mealType: 'lunch',
            caloriePercentage: 27.3, // 600/2200 * 100
            proteinPercentage: 28,
            carbsPercentage: 27,
            fatPercentage: 27
          },
          {
            mealOrder: 5,
            mealName: 'Afternoon Protein',
            mealTime: '15:30',
            targetCalories: 300,
            mealType: 'snack',
            caloriePercentage: 13.6, // 300/2200 * 100
            proteinPercentage: 15,
            carbsPercentage: 13,
            fatPercentage: 12
          },
          {
            mealOrder: 6,
            mealName: 'Dinner',
            mealTime: '18:30',
            targetCalories: 350,
            mealType: 'dinner',
            caloriePercentage: 15.9, // 350/2200 * 100
            proteinPercentage: 8,
            carbsPercentage: 18,
            fatPercentage: 24
          }
        ]
      })
    });

    const createProgramResult = await createProgramResponse.json();
    console.log('✅ Create Program Response:', JSON.stringify(createProgramResult, null, 2));

    if (!createProgramResult.success) {
      throw new Error(`Failed to create meal program: ${createProgramResult.error}`);
    }

    // 4. Test meal plan generation from program
    console.log('\n4️⃣ Testing meal plan generation from program...');
    const mealPlanResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        type: 'meal-plan',
        action: 'preview',
        clientId: CLIENT_ID,
        planDate: '2025-01-26',
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        cuisinePreferences: ['mediterranean'],
        uiOverrideMeals: [
          {
            mealOrder: 1,
            targetCalories: 250 // Override from 200 to 250
          },
          {
            mealOrder: 2,
            targetCalories: 550 // Override from 500 to 550
          }
        ]
      })
    });

    const mealPlanResult = await mealPlanResponse.json();
    console.log('✅ Meal Plan from Program Response:', JSON.stringify(mealPlanResult, null, 2));

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the tests
testClientGoals();
