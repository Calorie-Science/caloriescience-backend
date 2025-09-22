const { GeminiService } = require('./lib/geminiService.ts');

async function testGemini() {
  console.log('🧪 Testing Gemini Service...');
  
  try {
    const geminiService = new GeminiService();
    
    // Test data
    const testRequest = {
      clientGoals: {
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
      },
      additionalText: 'Focus on breakfast and lunch meals',
      clientId: 'test-client-123',
      nutritionistId: 'test-nutritionist-456'
    };
    
    console.log('📝 Sending test request to Gemini...');
    const response = await geminiService.generateMealPlanSync(testRequest);
    
    if (response.success) {
      console.log('✅ Gemini test successful!');
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Gemini test failed:', response.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testGemini();
