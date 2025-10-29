#!/bin/bash

# Test script for optional macro goals feature
# This tests creating a client goal with only dietary preferences

API_URL="https://caloriescience-api.vercel.app/api/meal-plans"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxMDllMmY3LThmZDAtNGQ5Ni1iMjUwLTMxZjMzOWQ4NDI0NiIsImVtYWlsIjoidmFuZGFuYUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjEzODE2NjUsImV4cCI6MTc2MTk4NjQ2NX0.YxFTCOTo8NxnotkBQkOmPGg_cBXBpAjKYsWmtPoRY-c"
CLIENT_ID="ea99a96a-fbd2-4c2e-97d9-4917ea7f570d"

echo "🧪 Testing Optional Macro Goals Feature"
echo "========================================"
echo ""

echo "📋 Test 1: Create goal with only dietary preferences (no macros)"
echo "----------------------------------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "client-goal",
    "clientId": "'"$CLIENT_ID"'",
    "cuisineTypes": ["american"],
    "allergies": ["dairy-free"],
    "preferences": ["dairy-free"]
  }' | jq '.'

echo ""
echo ""
echo "📋 Test 2: Update goal to add macro values"
echo "-------------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "client-goal",
    "clientId": "'"$CLIENT_ID"'",
    "eerGoalCalories": 2000,
    "proteinGoalMin": 100,
    "proteinGoalMax": 150,
    "carbsGoalMin": 200,
    "carbsGoalMax": 250,
    "fatGoalMin": 50,
    "fatGoalMax": 70,
    "fiberGoalGrams": 25,
    "waterGoalLiters": 2.5
  }' | jq '.'

echo ""
echo ""
echo "📋 Test 3: Update only cuisine types (keep macros intact)"
echo "----------------------------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "client-goal",
    "clientId": "'"$CLIENT_ID"'",
    "cuisineTypes": ["american", "mediterranean", "asian"]
  }' | jq '.'

echo ""
echo "✅ Tests completed!"

