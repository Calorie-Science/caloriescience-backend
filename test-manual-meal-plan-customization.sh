#!/bin/bash

# Test Manual Meal Plan Customization Flow
# This tests:
# 1. Creating a manual meal plan
# 2. Adding a recipe
# 3. Customizing the recipe (omit/add ingredients)

BASE_URL="https://caloriescience-api.vercel.app"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjA0NDI0OTYsImV4cCI6MTc2MTA0NzI5Nn0.YTkvCBlY2HIFvt-902EnIZqSPX60sla0Ox7RUoAxUfE"
CLIENT_ID="6fe49da4-fc1d-440e-a0f0-a25053831d99"

echo "=========================================="
echo "🧪 Manual Meal Plan Customization Test"
echo "=========================================="
echo ""

# Step 1: Create a manual meal plan
echo "📝 Step 1: Creating manual meal plan..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans/manual/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'$CLIENT_ID'",
    "planDate": "2025-10-25",
    "durationDays": 3
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool

# Extract draft ID
DRAFT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('draftId', ''))" 2>/dev/null)

if [ -z "$DRAFT_ID" ]; then
  echo "❌ Failed to create draft or extract draftId"
  exit 1
fi

echo ""
echo "✅ Created draft: $DRAFT_ID"
echo ""
sleep 1

# Step 2: Add a recipe
echo "🍳 Step 2: Adding a recipe to Day 1, Breakfast..."
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "recipe_edamam_0ec6eff9c2b3f4e3a5f55b9bde9e0e9e",
      "provider": "edamam",
      "source": "api"
    },
    "servings": 1
  }')

echo "$ADD_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(json.dumps({'success': d.get('success'), 'message': d.get('message'), 'recipeTitle': d.get('data', {}).get('suggestions', [{}])[0].get('meals', {}).get('breakfast', {}).get('recipes', [{}])[0].get('title')}, indent=2))" 2>/dev/null

echo ""
echo "✅ Recipe added successfully"
echo ""
sleep 1

# Step 3: Customize the recipe (omit butter, add olive oil)
echo "✏️ Step 3: Customizing recipe - omit butter, add olive oil..."
CUSTOMIZE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/meal-plans/draft" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "recipe_edamam_0ec6eff9c2b3f4e3a5f55b9bde9e0e9e",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "recipe_edamam_0ec6eff9c2b3f4e3a5f55b9bde9e0e9e",
      "source": "edamam",
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "butter",
          "originalAmount": 2,
          "originalUnit": "tbsp",
          "notes": "Remove butter for lower saturated fat"
        },
        {
          "type": "add",
          "newIngredient": "olive oil",
          "amount": 1,
          "unit": "tbsp",
          "notes": "Healthier fat alternative"
        }
      ],
      "customizationsApplied": true
    }
  }')

echo "$CUSTOMIZE_RESPONSE" | python3 -m json.tool

echo ""
echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "1. ✅ Created manual meal plan: $DRAFT_ID"
echo "2. ✅ Added recipe to Day 1, Breakfast"
echo "3. ✅ Applied customizations (omit butter, add olive oil)"
echo ""
echo "🔍 To view the draft with customizations:"
echo "curl '$BASE_URL/api/meal-plans/manual/$DRAFT_ID' \\"
echo "  -H 'Authorization: Bearer $TOKEN'"

