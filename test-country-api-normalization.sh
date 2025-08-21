#!/bin/bash

# Test script to verify that API endpoints normalize country inputs correctly
# Tests various country input formats to ensure backend always converts to lowercase

echo "🧪 Testing API Country Normalization..."
echo "======================================"

API_URL="https://caloriescience-api.vercel.app"

echo ""
echo "1. Testing EER Calculation with different country cases..."

# Test 1: Uppercase country
echo "📊 Test 1: INDIA (uppercase)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateEer",
    "location": "INDIA",
    "age": 30,
    "gender": "female",
    "heightCm": 160,
    "weightKg": 70,
    "activityLevel": "moderately_active"
  }' | jq -r '.success, .eerCalories' 2>/dev/null || echo "API call failed"

echo ""

# Test 2: Mixed case country
echo "📊 Test 2: United States (mixed case)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateEer",
    "location": "United States",
    "age": 25,
    "gender": "male",
    "heightCm": 175,
    "weightKg": 75,
    "activityLevel": "moderately_active"
  }' | jq -r '.success, .eerCalories' 2>/dev/null || echo "API call failed"

echo ""

# Test 3: Lowercase country
echo "📊 Test 3: uk (lowercase)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateEer",
    "location": "uk",
    "age": 28,
    "gender": "female",
    "heightCm": 165,
    "weightKg": 60,
    "activityLevel": "lightly_active"
  }' | jq -r '.success, .eerCalories' 2>/dev/null || echo "API call failed"

echo ""
echo "2. Testing Macros Calculation with different country cases..."

# Test 4: Macros with uppercase
echo "📊 Test 4: Macros with INDIA (uppercase)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateMacros",
    "eer": 2000,
    "location": "INDIA",
    "age": 30,
    "gender": "female",
    "weightKg": 70
  }' | jq -r '.success, .proteinGrams' 2>/dev/null || echo "API call failed"

echo ""

# Test 5: Macros with mixed case
echo "📊 Test 5: Macros with France (mixed case - should map to EU)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateMacros",
    "eer": 2200,
    "location": "France",
    "age": 35,
    "gender": "male",
    "weightKg": 80
  }' | jq -r '.success, .proteinGrams' 2>/dev/null || echo "API call failed"

echo ""
echo "3. Testing Micronutrient Calculation with different country cases..."

# Test 6: Micronutrients with uppercase
echo "📊 Test 6: Micronutrients with UK (uppercase)"
curl -s -X POST "${API_URL}/api/calculations" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateMicronutrients",
    "location": "UK",
    "age": 30,
    "gender": "female"
  }' | jq -r '.success, .micronutrients.vitamins | length' 2>/dev/null || echo "API call failed"

echo ""

echo "🎯 Expected Results:"
echo "- All API calls should return success: true"
echo "- All responses should have valid calculated values"
echo "- Backend should handle all country case variations gracefully"
echo "- Database queries should work consistently with lowercase normalization"

echo ""
echo "✅ Test completed. Check above responses for success status and calculated values."
echo "If any calls failed, check that:"
echo "1. API is accessible"
echo "2. Country normalization is working in backend"
echo "3. Database contains lowercase country values"
