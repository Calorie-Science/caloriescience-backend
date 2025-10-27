#!/bin/bash

# Test Custom Recipe API Format
# Verifies that the API returns recipes in the standard UnifiedRecipeSummary format

echo "🧪 Testing Custom Recipe API Format"
echo "===================================="

API_URL="https://caloriescience-api.vercel.app/api/recipes/custom?page=1&limit=12"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjEwNjE5NzcsImV4cCI6MTc2MTY2Njc3N30.OjtHlR9gbctJ54EW0MOdXpjIf8Si4Ki0lt12JxUiomU"

echo ""
echo "📡 Fetching custom recipes..."

RESPONSE=$(curl -s "$API_URL" \
  -H "accept: application/json" \
  -H "authorization: Bearer $TOKEN")

echo ""
echo "📋 Checking response format..."

# Check for standard UnifiedRecipeSummary fields
if echo "$RESPONSE" | jq -e '.data[0].title' > /dev/null 2>&1; then
  echo "✅ 'title' field exists (correct)"
else
  echo "❌ 'title' field missing (should exist)"
fi

if echo "$RESPONSE" | jq -e '.data[0].image' > /dev/null 2>&1; then
  echo "✅ 'image' field exists (correct)"
else
  echo "❌ 'image' field missing (should exist)"
fi

if echo "$RESPONSE" | jq -e '.data[0].source' > /dev/null 2>&1; then
  SOURCE=$(echo "$RESPONSE" | jq -r '.data[0].source')
  if [ "$SOURCE" = "manual" ]; then
    echo "✅ 'source' field is 'manual' (correct)"
  else
    echo "⚠️  'source' field is '$SOURCE' (expected 'manual')"
  fi
else
  echo "❌ 'source' field missing (should exist)"
fi

if echo "$RESPONSE" | jq -e '.data[0].calories' > /dev/null 2>&1; then
  echo "✅ 'calories' field exists (correct)"
else
  echo "❌ 'calories' field missing (should exist)"
fi

if echo "$RESPONSE" | jq -e '.data[0].protein' > /dev/null 2>&1; then
  echo "✅ 'protein' field exists (correct)"
else
  echo "❌ 'protein' field missing (should exist)"
fi

if echo "$RESPONSE" | jq -e '.data[0].isCustom' > /dev/null 2>&1; then
  IS_CUSTOM=$(echo "$RESPONSE" | jq -r '.data[0].isCustom')
  if [ "$IS_CUSTOM" = "true" ]; then
    echo "✅ 'isCustom' field is true (correct)"
  else
    echo "⚠️  'isCustom' field is '$IS_CUSTOM' (expected true)"
  fi
else
  echo "❌ 'isCustom' field missing (should exist)"
fi

# Check for OLD fields that should NOT be present at top level
echo ""
echo "🔍 Checking for old field names..."

if echo "$RESPONSE" | jq -e '.data[0].recipeName' > /dev/null 2>&1; then
  echo "⚠️  'recipeName' field still exists (should be 'title')"
else
  echo "✅ 'recipeName' field not present (correct)"
fi

if echo "$RESPONSE" | jq -e '.data[0].recipeImageUrl' > /dev/null 2>&1; then
  echo "⚠️  'recipeImageUrl' field still exists (should be 'image')"
else
  echo "✅ 'recipeImageUrl' field not present (correct)"
fi

if echo "$RESPONSE" | jq -e '.data[0].caloriesPerServing' > /dev/null 2>&1; then
  echo "⚠️  'caloriesPerServing' field still exists (should be 'calories')"
else
  echo "✅ 'caloriesPerServing' field not present (correct)"
fi

echo ""
echo "📊 Sample Recipe:"
echo "$RESPONSE" | jq '.data[0] | {id, title, image, source, calories, protein, carbs, fat, isCustom, cuisineType, mealType}'

echo ""
echo "✅ Format check complete!"

