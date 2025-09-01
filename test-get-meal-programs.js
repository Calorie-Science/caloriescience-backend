const BASE_URL = 'https://caloriescience-api.vercel.app';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NTY4MjE2MiwiZXhwIjoxNzU2Mjg2OTYyfQ.nv1cD-JFf3mH8oChwMRR4S_Fff4cpzdJdJ2EVGn8kII';
const CLIENT_ID = 'b543f1f8-87f9-4d84-835e-78385546321a';

async function getMealPrograms() {
  console.log('🔍 Getting meal programs for client...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/meal-plans?clientId=${CLIENT_ID}&mode=meal-programs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Meal programs fetched successfully!');
      console.log('📊 Total meal programs:', data.data.length);
      
      data.data.forEach((program, index) => {
        console.log(`\n🍽️ Meal Program ${index + 1}:`);
        console.log(`   Name: ${program.name}`);
        console.log(`   Description: ${program.description}`);
        console.log(`   Active: ${program.isActive}`);
        console.log(`   Total Meals: ${program.meals.length}`);
        
        program.meals.forEach(meal => {
          console.log(`     - ${meal.mealName} (${meal.mealTime}) - ${meal.targetCalories} cal`);
        });
      });
    } else {
      console.error('❌ Failed to fetch meal programs:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
getMealPrograms();
