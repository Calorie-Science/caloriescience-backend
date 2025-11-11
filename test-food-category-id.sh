#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg3NWNkNWIxLTMxNGItNDU3YS1hMzA2LWY2OWZmMzcwODliNCIsImVtYWlsIjoibXJpbmFsQHRlc3QuY29tIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MjMyMTk5MiwiZXhwIjoxNzYyOTI2NzkyfQ.DZTueg_WqOc_kgw9_gd09DBuuJxL2PCBPBLRJciRc8w"
API_URL="https://caloriescience-api.vercel.app"
FOOD_CATEGORY_ID="797494de-7f93-4e2c-af6d-9e6f9c77c122"  # soup_thin

echo "========================================="
echo "Testing Food Category ID Integration"
echo "========================================="
echo ""

# Step 1: Create a recipe with foodCategoryId
echo "Step 1: Creating recipe with foodCategoryId..."
echo ""

CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/api/recipes/custom" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "recipeName": "Test Soup with Category ID",
    "ingredients": [
      {
        "name": "Chicken Broth",
        "quantity": 4,
        "unit": "cups",
        "nutritionData": {
          "calories": 40,
          "macros": {
            "protein": 2,
            "carbs": 1,
            "fat": 1,
            "fiber": 0,
            "sugar": 0,
            "sodium": 800
          },
          "micros": {
            "vitamins": {},
            "minerals": {}
          }
        }
      },
      {
        "name": "Carrots",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 50,
          "macros": {
            "protein": 1,
            "carbs": 12,
            "fat": 0,
            "fiber": 3,
            "sugar": 6,
            "sodium": 70
          },
          "micros": {
            "vitamins": {},
            "minerals": {}
          }
        }
      }
    ],
    "servings": 4,
    "foodCategoryId": "'"${FOOD_CATEGORY_ID}"'",
    "description": "A simple test soup to verify food category ID integration",
    "isPublic": false
  }')

echo "Create Response:"
echo "$CREATE_RESPONSE" | python3 -m json.tool
echo ""

# Extract recipe ID
RECIPE_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$RECIPE_ID" ]; then
  echo "❌ Failed to create recipe or extract recipe ID"
  exit 1
fi

echo "✅ Recipe created with ID: $RECIPE_ID"
echo ""

# Step 2: Get recipe details
echo "Step 2: Fetching recipe details..."
echo ""

DETAILS_RESPONSE=$(curl -s "${API_URL}/api/recipes/${RECIPE_ID}/details?provider=manual" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Recipe Details Response:"
echo "$DETAILS_RESPONSE" | python3 -m json.tool
echo ""

# Step 3: Check if foodCategory object is present
echo "Step 3: Checking for foodCategory details..."
echo ""

HAS_FOOD_CATEGORY_ID=$(echo "$DETAILS_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); print('yes' if data.get('recipe', {}).get('foodCategoryId') else 'no')" 2>/dev/null)

HAS_FOOD_CATEGORY_NAME=$(echo "$DETAILS_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); fc = data.get('recipe', {}).get('foodCategory', {}); print('yes' if fc and fc.get('name') else 'no')" 2>/dev/null)

CATEGORY_NAME=$(echo "$DETAILS_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); fc = data.get('recipe', {}).get('foodCategory', {}); print(fc.get('name', 'N/A'))" 2>/dev/null)

CATEGORY_CODE=$(echo "$DETAILS_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); fc = data.get('recipe', {}).get('foodCategory', {}); print(fc.get('code', 'N/A'))" 2>/dev/null)

CATEGORY_GROUP=$(echo "$DETAILS_RESPONSE" | python3 -c "import json, sys; data = json.load(sys.stdin); fc = data.get('recipe', {}).get('foodCategory', {}); print(fc.get('category_group', 'N/A'))" 2>/dev/null)

echo "Results:"
echo "--------"
echo "foodCategoryId present: $HAS_FOOD_CATEGORY_ID"
echo "foodCategory.name present: $HAS_FOOD_CATEGORY_NAME"
echo "Category Name: $CATEGORY_NAME"
echo "Category Code: $CATEGORY_CODE"
echo "Category Group: $CATEGORY_GROUP"
echo ""

if [ "$HAS_FOOD_CATEGORY_ID" = "yes" ] && [ "$HAS_FOOD_CATEGORY_NAME" = "yes" ]; then
  echo "✅ SUCCESS: Recipe details include foodCategoryId and foodCategory object with name!"
  echo "   Category: $CATEGORY_NAME ($CATEGORY_CODE)"
else
  echo "❌ FAIL: Missing foodCategoryId or foodCategory.name in response"
fi

echo ""
echo "========================================="
echo "Test Complete"
echo "========================================="
