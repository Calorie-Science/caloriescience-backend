#!/usr/bin/env node

/**
 * Test script for meal creation with days=1 and consolidated multi-day response
 * This script tests:
 * 1. Creating a meal plan with days=1
 * 2. Getting the consolidated multi-day response
 */

const https = require('https');

// Configuration
const API_BASE_URL = 'https://caloriescience-api.vercel.app';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NTc0OTI4ODIsImV4cCI6MTc1ODA5NzY4Mn0.1I5CzH9xXX5Fi15slA1jqusll1H9g4OSntTZVzYrfyk';
const CLIENT_ID = '3935fbb6-2699-41b4-b41c-7d27f71583b4';
const START_DATE = '2026-02-20';

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test 1: Create meal plan with days=1
async function testMealCreationSingleDay() {
  console.log('🧪 Test 1: Creating meal plan with days=1');
  console.log('=' .repeat(50));
  
  const requestData = {
    type: "meal-plan",
    action: "preview",
    clientId: CLIENT_ID,
    startDate: START_DATE,
    days: 1
  };
  
  const options = {
    hostname: 'caloriescience-api.vercel.app',
    port: 443,
    path: '/api/meal-plans',
    method: 'POST',
    headers: {
      'authorization': `Bearer ${AUTH_TOKEN}`,
      'content-type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest(options, JSON.stringify(requestData));
    
    console.log(`Status Code: ${response.statusCode}`);
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('\n✅ Meal plan creation successful!');
      
      // Extract previewId for next test
      const previewId = response.data.data?.mealPlan?.previewId;
      if (previewId) {
        console.log(`📋 Preview ID: ${previewId}`);
        return previewId;
      } else {
        console.log('⚠️  No previewId found in response');
        return null;
      }
    } else {
      console.log('\n❌ Meal plan creation failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating meal plan:', error.message);
    return null;
  }
}

// Test 2: Get consolidated multi-day response
async function testConsolidatedResponse(previewId) {
  console.log('\n🧪 Test 2: Getting consolidated multi-day response');
  console.log('=' .repeat(50));
  
  if (!previewId) {
    console.log('⚠️  Skipping consolidated response test - no previewId available');
    return;
  }
  
  const options = {
    hostname: 'caloriescience-api.vercel.app',
    port: 443,
    path: `/api/meal-plans?clientId=${CLIENT_ID}&mode=meal-plan-detail&mealPlanId=${previewId}&view=consolidated`,
    method: 'GET',
    headers: {
      'authorization': `Bearer ${AUTH_TOKEN}`,
      'content-type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    console.log(`Status Code: ${response.statusCode}`);
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('\n✅ Consolidated response retrieved successfully!');
      
      // Analyze the response structure
      const data = response.data.data;
      if (data) {
        console.log('\n📊 Response Structure Analysis:');
        console.log(`- Has mealPlan: ${!!data.mealPlan}`);
        console.log(`- Has clientGoals: ${!!data.clientGoals}`);
        console.log(`- Has mealProgram: ${!!data.mealProgram}`);
        console.log(`- Has planDate: ${!!data.planDate}`);
        
        if (data.mealPlan) {
          console.log(`- Meal plan ID: ${data.mealPlan.id}`);
          console.log(`- Meal plan status: ${data.mealPlan.status}`);
          console.log(`- Number of meals: ${data.mealPlan.meals?.length || 0}`);
          console.log(`- Target calories: ${data.mealPlan.targetCalories || 'N/A'}`);
        }
      }
    } else {
      console.log('\n❌ Consolidated response retrieval failed');
    }
  } catch (error) {
    console.error('❌ Error getting consolidated response:', error.message);
  }
}

// Test 3: Test with different view modes
async function testDifferentViewModes(previewId) {
  console.log('\n🧪 Test 3: Testing different view modes');
  console.log('=' .repeat(50));
  
  if (!previewId) {
    console.log('⚠️  Skipping view modes test - no previewId available');
    return;
  }
  
  const viewModes = ['consolidated', 'day-wise', 'day'];
  
  for (const view of viewModes) {
    console.log(`\n🔍 Testing view mode: ${view}`);
    
    const options = {
      hostname: 'caloriescience-api.vercel.app',
      port: 443,
      path: `/api/meal-plans?clientId=${CLIENT_ID}&mode=meal-plan-detail&mealPlanId=${previewId}&view=${view}`,
      method: 'GET',
      headers: {
        'authorization': `Bearer ${AUTH_TOKEN}`,
        'content-type': 'application/json'
      }
    };
    
    try {
      const response = await makeRequest(options);
      
      console.log(`  Status Code: ${response.statusCode}`);
      if (response.statusCode === 200 && response.data.success) {
        console.log(`  ✅ ${view} view successful`);
        
        // Show structure for each view
        const data = response.data.data;
        if (data) {
          console.log(`  📊 ${view} structure:`);
          console.log(`    - Keys: ${Object.keys(data).join(', ')}`);
          if (data.mealPlan && data.mealPlan.meals) {
            console.log(`    - Meals count: ${data.mealPlan.meals.length}`);
          }
        }
      } else {
        console.log(`  ❌ ${view} view failed`);
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${view} view:`, error.message);
    }
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Meal Creation Tests');
  console.log('=' .repeat(60));
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log(`Start Date: ${START_DATE}`);
  console.log(`Days: 1`);
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create meal plan with days=1
    const previewId = await testMealCreationSingleDay();
    
    // Test 2: Get consolidated response
    await testConsolidatedResponse(previewId);
    
    // Test 3: Test different view modes
    await testDifferentViewModes(previewId);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runTests();
