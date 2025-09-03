const axios = require('axios');

// Configuration
const API_BASE_URL = 'https://caloriescience-api.vercel.app/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE';
const CLIENT_ID = 'b543f1f8-87f9-4d84-835e-78385546321a';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function testEditMealPrograms() {
  console.log('🧪 Testing Meal Program and Meal Plan Edit APIs...\n');

  try {
    // 1. First, get existing meal programs to find an ID to edit
    console.log('📋 1. Getting existing meal programs...');
    const getProgramsResponse = await axios.get(`${API_BASE_URL}/meal-plans?clientId=${CLIENT_ID}&mode=meal-programs`, { headers });
    
    if (getProgramsResponse.data.success && getProgramsResponse.data.data.length > 0) {
      const mealProgramId = getProgramsResponse.data.data[0].id;
      console.log(`✅ Found meal program ID: ${mealProgramId}`);
      
      // 2. Update meal program using consolidated API
      console.log('\n📋 2. Updating meal program using consolidated API...');
      const updateProgramData = {
        type: 'meal-program',
        action: 'update',
        clientId: CLIENT_ID,
        mealProgramId: mealProgramId,
        name: 'Updated High Protein Meal Program',
        description: 'Updated description for high protein meal program',
        meals: [
          {
            mealOrder: 1,
            mealName: 'Updated Pre-Breakfast Protein',
            mealTime: '06:30:00',
            targetCalories: 250,
            mealType: 'breakfast'
          },
          {
            mealOrder: 2,
            mealName: 'Updated Breakfast',
            mealTime: '08:00:00',
            targetCalories: 550,
            mealType: 'breakfast'
          },
          {
            mealOrder: 3,
            mealName: 'Updated Mid-Morning Snack',
            mealTime: '10:30:00',
            targetCalories: 300,
            mealType: 'snack'
          },
          {
            mealOrder: 4,
            mealName: 'Updated Lunch',
            mealTime: '13:00:00',
            targetCalories: 650,
            mealType: 'lunch'
          },
          {
            mealOrder: 5,
            mealName: 'Updated Afternoon Protein',
            mealTime: '16:00:00',
            targetCalories: 350,
            mealType: 'snack'
          },
          {
            mealOrder: 6,
            mealName: 'Updated Dinner',
            mealTime: '19:00:00',
            targetCalories: 400,
            mealType: 'dinner'
          }
        ]
      };
      
      const updateProgramResponse = await axios.post(`${API_BASE_URL}/meal-plans`, updateProgramData, { headers });
      console.log('✅ Meal program updated successfully:', JSON.stringify(updateProgramResponse.data, null, 2));
      
      // 3. Activate meal program using consolidated API
      console.log('\n📋 3. Activating meal program using consolidated API...');
      const activateResponse = await axios.post(`${API_BASE_URL}/meal-plans`, {
        type: 'meal-program',
        action: 'activate',
        clientId: CLIENT_ID,
        mealProgramId: mealProgramId
      }, { headers });
      console.log('✅ Meal program activated:', JSON.stringify(activateResponse.data, null, 2));
      
    } else {
      console.log('❌ No meal programs found. Creating a new one first...');
      
      // Create a new meal program first
      const createProgramData = {
        type: 'meal-program',
        clientId: CLIENT_ID,
        name: 'Test Meal Program for Editing',
        description: 'A test meal program to demonstrate editing functionality',
        meals: [
          {
            mealOrder: 1,
            mealName: 'Test Breakfast',
            mealTime: '08:00:00',
            targetCalories: 400,
            mealType: 'breakfast'
          },
          {
            mealOrder: 2,
            mealName: 'Test Lunch',
            mealTime: '13:00:00',
            targetCalories: 600,
            mealType: 'lunch'
          },
          {
            mealOrder: 3,
            mealName: 'Test Dinner',
            mealTime: '19:00:00',
            targetCalories: 500,
            mealType: 'dinner'
          }
        ]
      };
      
      const createResponse = await axios.post(`${API_BASE_URL}/meal-plans`, createProgramData, { headers });
      console.log('✅ New meal program created:', JSON.stringify(createResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing meal program edits:', error.response?.data || error.message);
  }
}

async function testEditMealPlans() {
  console.log('\n🧪 Testing Meal Plan Edit APIs...\n');

  try {
    // 1. Get existing meal plans
    console.log('📋 1. Getting existing meal plans...');
    const getPlansResponse = await axios.get(`${API_BASE_URL}/meal-plans?clientId=${CLIENT_ID}`, { headers });
    
    if (getPlansResponse.data.mealPlans && getPlansResponse.data.mealPlans.length > 0) {
      const mealPlanId = getPlansResponse.data.mealPlans[0].id;
      console.log(`✅ Found meal plan ID: ${mealPlanId}`);
      
      // 2. Update meal plan
      console.log('\n📋 2. Updating meal plan...');
      const updatePlanData = {
        mealPlanId: mealPlanId,
        action: 'update',
        planName: 'Updated Meal Plan',
        planDate: '2025-09-20',
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        cuisinePreferences: ['Mediterranean', 'Italian']
      };
      
      const updatePlanResponse = await axios.put(`${API_BASE_URL}/meal-plans`, updatePlanData, { headers });
      console.log('✅ Meal plan updated successfully:', JSON.stringify(updatePlanResponse.data, null, 2));
      
    } else {
      console.log('❌ No meal plans found. Create a meal plan first using the preview endpoint.');
    }
    
  } catch (error) {
    console.error('❌ Error testing meal plan edits:', error.response?.data || error.message);
  }
}

// Run the tests
async function runTests() {
  await testEditMealPrograms();
  await testEditMealPlans();
  console.log('\n✅ All tests completed!');
}

runTests();
