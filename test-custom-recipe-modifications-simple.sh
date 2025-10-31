#!/bin/bash

# Simple test script for Custom Recipe Ingredient Modifications API
# Usage: AUTH_TOKEN='your-token' RECIPE_ID='recipe-uuid' ./test-custom-recipe-modifications-simple.sh

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
RECIPE_ID="${RECIPE_ID:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Error: AUTH_TOKEN not set"
  echo "Usage: AUTH_TOKEN='your-token' RECIPE_ID='recipe-uuid' ./test-custom-recipe-modifications-simple.sh"
  exit 1
fi

if [ -z "$RECIPE_ID" ]; then
  echo "❌ Error: RECIPE_ID not set"
  echo "Usage: AUTH_TOKEN='your-token' RECIPE_ID='recipe-uuid' ./test-custom-recipe-modifications-simple.sh"
  exit 1
fi

echo "🧪 Testing recipe modification for: $RECIPE_ID"
echo ""

# Test: Replace butter with olive oil, remove sugar, add honey
echo "📝 Modification: Replace butter → olive oil, remove sugar, add honey"
echo ""

curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "butter",
        "originalAmount": 4,
        "originalUnit": "tablespoons",
        "newIngredient": "olive oil",
        "amount": 3,
        "unit": "tablespoons"
      },
      {
        "type": "omit",
        "originalIngredient": "white sugar",
        "originalAmount": 0.25,
        "originalUnit": "cup"
      },
      {
        "type": "add",
        "newIngredient": "honey",
        "amount": 2,
        "unit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'

echo ""
echo "✅ Test completed!"
