const axios = require('axios');

// Configuration
const API_BASE_URL = 'https://caloriescience-api.vercel.app/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE';
const CLIENT_ID = 'b543f1f8-87f9-4d84-835e-78385546321a';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function testMealProgramCRUD() {
  console.log('🧪 Testing Complete Meal Program CRUD Operations...\n');

  let createdMealProgramId = null;

  try {
    // 1. CREATE - Create a new meal program
    console.log('📋 1. Creating new meal program...');
    const createData = {
      type: 'meal-program',
      clientId: CLIENT_ID,
      name: 'Test Meal Program for CRUD',
      description: 'A test meal program to demonstrate all CRUD operations',
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

    const createResponse = await axios.post(`${API_BASE_URL}/meal-plans`, createData, { headers });
    console.log('✅ Meal program created successfully:', JSON.stringify(createResponse.data, null, 2));
    
    if (createResponse.data.success && createResponse.data.data) {
      createdMealProgramId = createResponse.data.data.id;
      console.log(`✅ Created meal program ID: ${createdMealProgramId}`);
    }

    // 2. READ - Get all meal programs
    console.log('\n📋 2. Getting all meal programs...');
    const getProgramsResponse = await axios.get(`${API_BASE_URL}/meal-plans?clientId=${CLIENT_ID}&mode=meal-programs`, { headers });
    console.log('✅ Meal programs retrieved:', JSON.stringify(getProgramsResponse.data, null, 2));

    // 3. UPDATE - Update the created meal program
    if (createdMealProgramId) {
      console.log('\n📋 3. Updating meal program...');
      const updateData = {
        type: 'meal-program',
        action: 'update',
        clientId: CLIENT_ID,
        mealProgramId: createdMealProgramId,
        name: 'Updated Test Meal Program',
        description: 'Updated description for test meal program',
        meals: [
          {
            mealOrder: 1,
            mealName: 'Updated Breakfast',
            mealTime: '08:30:00',
            targetCalories: 450,
            mealType: 'breakfast'
          },
          {
            mealOrder: 2,
            mealName: 'Updated Lunch',
            mealTime: '13:30:00',
            targetCalories: 650,
            mealType: 'lunch'
          },
          {
            mealOrder: 3,
            mealName: 'Updated Dinner',
            mealTime: '19:30:00',
            targetCalories: 550,
            mealType: 'dinner'
          },
          {
            mealOrder: 4,
            mealName: 'New Snack',
            mealTime: '15:00:00',
            targetCalories: 200,
            mealType: 'snack'
          }
        ]
      };

      const updateResponse = await axios.post(`${API_BASE_URL}/meal-plans`, updateData, { headers });
      console.log('✅ Meal program updated successfully:', JSON.stringify(updateResponse.data, null, 2));
    }

    // 4. ACTIVATE - Activate the meal program
    if (createdMealProgramId) {
      console.log('\n📋 4. Activating meal program...');
      const activateData = {
        type: 'meal-program',
        action: 'activate',
        clientId: CLIENT_ID,
        mealProgramId: createdMealProgramId
      };

      const activateResponse = await axios.post(`${API_BASE_URL}/meal-plans`, activateData, { headers });
      console.log('✅ Meal program activated successfully:', JSON.stringify(activateResponse.data, null, 2));
    }

    // 5. PREVIEW - Generate meal plan from the program
    console.log('\n📋 5. Generating meal plan preview from program...');
    const previewData = {
      action: 'preview',
      clientId: CLIENT_ID,
      planDate: '2025-09-20',
      dietaryRestrictions: [],
      cuisinePreferences: []
    };

    const previewResponse = await axios.post(`${API_BASE_URL}/meal-plans`, previewData, { headers });
    console.log('✅ Meal plan preview generated:', JSON.stringify({
      success: previewResponse.data.success,
      message: previewResponse.data.message,
      mealCount: previewResponse.data.data?.mealPlan?.meals?.length || 0,
      dailyNutrition: previewResponse.data.data?.mealPlan?.dailyNutrition
    }, null, 2));

    // 6. DELETE - Delete the created meal program
    if (createdMealProgramId) {
      console.log('\n📋 6. Deleting meal program...');
      const deleteData = {
        type: 'meal-program',
        action: 'delete',
        clientId: CLIENT_ID,
        mealProgramId: createdMealProgramId
      };

      const deleteResponse = await axios.post(`${API_BASE_URL}/meal-plans`, deleteData, { headers });
      console.log('✅ Meal program deleted successfully:', JSON.stringify(deleteResponse.data, null, 2));
    }

    // 7. VERIFY - Check that the program was deleted
    console.log('\n📋 7. Verifying deletion...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/meal-plans?clientId=${CLIENT_ID}&mode=meal-programs`, { headers });
    console.log('✅ Verification - Remaining meal programs:', JSON.stringify(verifyResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error in CRUD test:', error.response?.data || error.message);
  }
}

// Run the test
testMealProgramCRUD();
