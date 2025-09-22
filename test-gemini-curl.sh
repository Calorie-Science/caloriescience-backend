#!/bin/bash

echo "🧪 Testing Gemini Integration via API..."

# Test data for Gemini meal plan generation
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NTgwOTg2ODIsImV4cCI6MTc1ODcwMzQ4Mn0.3ele6zgHBU4pW6S-6X19upYtBstp-zRz4bWWU7mwhJk' \
--header 'Content-Type: application/json' \
--data '{
  "type": "meal-plan",
  "action": "async-generate",
  "clientId": "test-client-gemini-123",
  "planDate": "2025-01-17",
  "planType": "daily",
  "dietaryRestrictions": [],
  "cuisinePreferences": ["indian", "mediterranean"],
  "mealPreferences": {},
  "targetCalories": 2000,
  "macroTargets": {
    "protein": { "min": 100, "max": 150 },
    "carbs": { "min": 200, "max": 300 },
    "fat": { "min": 60, "max": 80 }
  },
  "days": 1,
  "startDate": "2025-01-17",
  "additionalText": "Focus on healthy breakfast and lunch meals. Prefer vegetarian options.",
  "aiModel": "gemini",
  "overrideClientGoals": {
    "eerGoalCalories": 2000,
    "proteinGoalMin": 100,
    "proteinGoalMax": 150,
    "carbsGoalMin": 200,
    "carbsGoalMax": 300,
    "fatGoalMin": 60,
    "fatGoalMax": 80,
    "fiberGoalGrams": 25,
    "waterGoalLiters": 2.0,
    "allergies": ["nuts"],
    "preferences": ["vegetarian"],
    "cuisineTypes": ["indian", "mediterranean"],
    "notes": "Prefer simple, quick meals"
  }
}'

echo -e "\n✅ Gemini test request sent!"
echo "📝 Check the response for the preview ID, then use it to check status"
