const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'https://caloriescience-api.vercel.app';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NTY4MjE2MiwiZXhwIjoxNzU2Mjg2OTYyfQ.nv1cD-JFf3mH8oChwMRR4S_Fff4cpzdJdJ2EVGn8kII';
const CLIENT_ID = 'b543f1f8-87f9-4d84-835e-78385546321a';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function testMealPrograms() {
  console.log('🧪 Testing Meal Programs API\n');

  try {
    // 1. Create a new meal program
    console.log('1️⃣ Creating a new meal program...');
    const createRequest = {
      type: 'meal-program',
      clientId: CLIENT_ID,
      name: 'High Protein 6-Meal Plan',
      description: 'A meal program designed for muscle building with 6 meals per day',
      meals: [
        {
          mealOrder: 1,
          mealName: 'Pre-Breakfast Protein',
          mealTime: '06:30',
          targetCalories: 200,
          mealType: 'snack'
        },
        {
          mealOrder: 2,
          mealName: 'Breakfast',
          mealTime: '08:00',
          targetCalories: 500,
          mealType: 'breakfast'
        },
        {
          mealOrder: 3,
          mealName: 'Mid-Morning Snack',
          mealTime: '10:30',
          targetCalories: 250,
          mealType: 'snack'
        },
        {
          mealOrder: 4,
          mealName: 'Lunch',
          mealTime: '13:00',
          targetCalories: 600,
          mealType: 'lunch'
        },
        {
          mealOrder: 5,
          mealName: 'Afternoon Protein',
          mealTime: '15:30',
          targetCalories: 300,
          mealType: 'snack'
        },
        {
          mealOrder: 6,
          mealName: 'Dinner',
          mealTime: '18:30',
          targetCalories: 550,
          mealType: 'dinner'
        }
      ]
    };

    const createResponse = await fetch(`${BASE_URL}/api/meal-plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createRequest)
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('✅ Meal program created successfully!');
      console.log('📋 Program ID:', createResult.data.id);
      console.log('🍽️ Meals count:', createResult.data.meals.length);
      console.log('⏰ First meal:', createResult.data.meals[0].mealName, 'at', createResult.data.meals[0].mealTime);
      console.log('⏰ Last meal:', createResult.data.meals[5].mealName, 'at', createResult.data.meals[5].mealTime);
    } else {
      console.log('❌ Failed to create meal program:', createResult.error);
      return;
    }

    const programId = createResult.data.id;

    // 2. Get all meal programs for the client
    console.log('\n2️⃣ Fetching all meal programs for the client...');
    const listResponse = await fetch(`${BASE_URL}/api/meal-plans?clientId=${CLIENT_ID}&mode=meal-programs`, {
      method: 'GET',
      headers
    });

    const listResult = await listResponse.json();
    
    if (listResponse.ok) {
      console.log('✅ Meal programs fetched successfully!');
      console.log('📊 Total programs:', listResult.data.length);
      listResult.data.forEach((program, index) => {
        console.log(`   ${index + 1}. ${program.name} (${program.meals.length} meals) - ${program.isActive ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('❌ Failed to fetch meal programs:', listResult.error);
    }

    // 3. Get the specific meal program by ID
    console.log('\n3️⃣ Fetching the specific meal program...');
    const getResponse = await fetch(`${BASE_URL}/api/meal-programs/${programId}`, {
      method: 'GET',
      headers
    });

    const getResult = await getResponse.json();
    
    if (getResponse.ok) {
      console.log('✅ Meal program fetched successfully!');
      console.log('📋 Program details:');
      console.log('   Name:', getResult.data.name);
      console.log('   Description:', getResult.data.description);
      console.log('   Status:', getResult.data.isActive ? 'Active' : 'Inactive');
      console.log('   Meals:');
      getResult.data.meals.forEach(meal => {
        console.log(`     ${meal.mealOrder}. ${meal.mealName} at ${meal.mealTime} (${meal.targetCalories} cal, ${meal.mealType})`);
      });
    } else {
      console.log('❌ Failed to fetch meal program:', getResult.error);
    }

    // 4. Update the meal program
    console.log('\n4️⃣ Updating the meal program...');
    const updateRequest = {
      name: 'Updated High Protein 6-Meal Plan',
      description: 'Updated description with better meal timing',
      meals: [
        {
          mealOrder: 1,
          mealName: 'Early Morning Protein',
          mealTime: '06:00',
          targetCalories: 250,
          mealType: 'snack'
        },
        {
          mealOrder: 2,
          mealName: 'Breakfast',
          mealTime: '08:30',
          targetCalories: 550,
          mealType: 'breakfast'
        },
        {
          mealOrder: 3,
          mealName: 'Morning Snack',
          mealTime: '10:00',
          targetCalories: 300,
          mealType: 'snack'
        },
        {
          mealOrder: 4,
          mealName: 'Lunch',
          mealTime: '12:30',
          targetCalories: 650,
          mealType: 'lunch'
        },
        {
          mealOrder: 5,
          mealName: 'Pre-Workout',
          mealTime: '15:00',
          targetCalories: 350,
          mealType: 'snack'
        },
        {
          mealOrder: 6,
          mealName: 'Dinner',
          mealTime: '19:00',
          targetCalories: 600,
          mealType: 'dinner'
        }
      ]
    };

    const updateResponse = await fetch(`${BASE_URL}/api/meal-programs/${programId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateRequest)
    });

    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('✅ Meal program updated successfully!');
      console.log('📋 Updated program details:');
      console.log('   Name:', updateResult.data.name);
      console.log('   Description:', updateResult.data.description);
      console.log('   Meals:');
      updateResult.data.meals.forEach(meal => {
        console.log(`     ${meal.mealOrder}. ${meal.mealName} at ${meal.mealTime} (${meal.targetCalories} cal, ${meal.mealType})`);
      });
    } else {
      console.log('❌ Failed to update meal program:', updateResult.error);
    }

    // 5. Test time validation
    console.log('\n5️⃣ Testing time validation...');
    const invalidTimeRequest = {
      clientId: CLIENT_ID,
      name: 'Invalid Time Test',
      meals: [
        {
          mealOrder: 1,
          mealName: 'Invalid Time',
          mealTime: '25:00', // Invalid time
          targetCalories: 200
        }
      ]
    };

    const invalidTimeResponse = await fetch(`${BASE_URL}/api/meal-programs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidTimeRequest)
    });

    const invalidTimeResult = await invalidTimeResponse.json();
    
    if (!invalidTimeResponse.ok) {
      console.log('✅ Time validation working correctly!');
      console.log('❌ Expected error:', invalidTimeResult.error);
    } else {
      console.log('❌ Time validation failed - should have rejected invalid time');
    }

    // 6. Test meal order validation
    console.log('\n6️⃣ Testing meal order validation...');
    const invalidOrderRequest = {
      clientId: CLIENT_ID,
      name: 'Invalid Order Test',
      meals: [
        {
          mealOrder: 1,
          mealName: 'First Meal',
          mealTime: '08:00',
          targetCalories: 200
        },
        {
          mealOrder: 1, // Duplicate order
          mealName: 'Second Meal',
          mealTime: '12:00',
          targetCalories: 300
        }
      ]
    };

    const invalidOrderResponse = await fetch(`${BASE_URL}/api/meal-programs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invalidOrderRequest)
    });

    const invalidOrderResult = await invalidOrderResponse.json();
    
    if (!invalidOrderResponse.ok) {
      console.log('✅ Meal order validation working correctly!');
      console.log('❌ Expected error:', invalidOrderResult.error);
    } else {
      console.log('❌ Meal order validation failed - should have rejected duplicate orders');
    }

    // 7. Clean up - Delete the test meal program
    console.log('\n7️⃣ Cleaning up - Deleting the test meal program...');
    const deleteResponse = await fetch(`${BASE_URL}/api/meal-programs/${programId}`, {
      method: 'DELETE',
      headers
    });

    const deleteResult = await deleteResponse.json();
    
    if (deleteResponse.ok) {
      console.log('✅ Meal program deleted successfully!');
    } else {
      console.log('❌ Failed to delete meal program:', deleteResult.error);
    }

    console.log('\n🎉 Meal Programs API testing completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testMealPrograms();
