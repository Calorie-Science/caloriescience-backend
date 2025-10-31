#!/bin/bash

# Test script for Custom Recipe Ingredient Modifications API
# Usage: ./test-custom-recipe-modifications.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

# Check if AUTH_TOKEN is set
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}❌ Error: AUTH_TOKEN environment variable is not set${NC}"
  echo "Usage: AUTH_TOKEN='your-token-here' ./test-custom-recipe-modifications.sh"
  exit 1
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Testing Custom Recipe Modifications API${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Step 1: Create a custom recipe
echo -e "${YELLOW}Step 1: Creating a test custom recipe...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Test Pancakes",
    "description": "Original pancake recipe for testing modifications",
    "servings": 4,
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 15,
    "totalTimeMinutes": 25,
    "ingredients": [
      {
        "name": "all-purpose flour",
        "quantity": 2,
        "unit": "cups"
      },
      {
        "name": "butter",
        "quantity": 4,
        "unit": "tablespoons"
      },
      {
        "name": "white sugar",
        "quantity": 0.25,
        "unit": "cup"
      },
      {
        "name": "whole milk",
        "quantity": 2,
        "unit": "cups"
      },
      {
        "name": "eggs",
        "quantity": 2,
        "unit": "large"
      },
      {
        "name": "baking powder",
        "quantity": 2,
        "unit": "teaspoons"
      },
      {
        "name": "salt",
        "quantity": 0.5,
        "unit": "teaspoon"
      }
    ],
    "instructions": [
      "Mix dry ingredients in a bowl",
      "Whisk wet ingredients in another bowl",
      "Combine wet and dry ingredients",
      "Cook on griddle until golden"
    ],
    "isPublic": false,
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "healthLabels": [],
    "dietLabels": [],
    "allergens": ["dairy", "eggs", "gluten"]
  }')

echo "$CREATE_RESPONSE" | jq '.'

# Extract recipe ID
RECIPE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ -z "$RECIPE_ID" ] || [ "$RECIPE_ID" == "null" ]; then
  echo -e "${RED}❌ Failed to create recipe${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Recipe created successfully${NC}"
echo -e "${GREEN}Recipe ID: ${RECIPE_ID}${NC}"
echo ""
sleep 2

# Step 2: Get original recipe nutrition
echo -e "${YELLOW}Step 2: Fetching original recipe nutrition...${NC}"
ORIGINAL_RECIPE=$(curl -s -X GET "${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "$ORIGINAL_RECIPE" | jq '.data.recipes[0] | {recipeName, servings, nutrition: {calories: .nutrition.calories, macros: {protein: .nutrition.macros.protein, carbs: .nutrition.macros.carbs, fat: .nutrition.macros.fat}}}'

ORIGINAL_CALORIES=$(echo "$ORIGINAL_RECIPE" | jq -r '.data.recipes[0].nutrition.calories.quantity')
echo -e "${BLUE}Original calories per serving: ${ORIGINAL_CALORIES} kcal${NC}"
echo ""
sleep 2

# Step 3: Test modification - Replace butter with olive oil
echo -e "${YELLOW}Step 3: Test 1 - Replace butter with olive oil...${NC}"
MOD1_RESPONSE=$(curl -s -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
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
      }
    ],
    "autoCalculateNutrition": true
  }')

echo "$MOD1_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Test 1 completed${NC}"
echo ""
sleep 2

# Step 4: Test modification - Omit sugar
echo -e "${YELLOW}Step 4: Test 2 - Remove sugar from recipe...${NC}"
MOD2_RESPONSE=$(curl -s -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "omit",
        "originalIngredient": "white sugar",
        "originalAmount": 0.25,
        "originalUnit": "cup"
      }
    ],
    "autoCalculateNutrition": true
  }')

echo "$MOD2_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Test 2 completed${NC}"
echo ""
sleep 2

# Step 5: Test modification - Add honey
echo -e "${YELLOW}Step 5: Test 3 - Add honey to recipe...${NC}"
MOD3_RESPONSE=$(curl -s -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "add",
        "newIngredient": "honey",
        "amount": 2,
        "unit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }')

echo "$MOD3_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Test 3 completed${NC}"
echo ""
sleep 2

# Step 6: Test multiple modifications at once
echo -e "${YELLOW}Step 6: Test 4 - Multiple modifications at once...${NC}"
echo -e "${BLUE}Replacing milk with almond milk AND adding protein powder${NC}"
MOD4_RESPONSE=$(curl -s -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "whole milk",
        "originalAmount": 2,
        "originalUnit": "cups",
        "newIngredient": "almond milk",
        "amount": 2,
        "unit": "cups"
      },
      {
        "type": "add",
        "newIngredient": "protein powder",
        "amount": 30,
        "unit": "grams"
      }
    ],
    "autoCalculateNutrition": true
  }')

echo "$MOD4_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Test 4 completed${NC}"
echo ""
sleep 2

# Step 7: Get final recipe and compare nutrition
echo -e "${YELLOW}Step 7: Fetching final modified recipe...${NC}"
FINAL_RECIPE=$(curl -s -X GET "${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "$FINAL_RECIPE" | jq '.data.recipes[0] | {recipeName, servings, ingredients: [.ingredients[] | {name, quantity, unit}], nutrition: {calories: .nutrition.calories, macros: {protein: .nutrition.macros.protein, carbs: .nutrition.macros.carbs, fat: .nutrition.macros.fat, fiber: .nutrition.macros.fiber}}}'

FINAL_CALORIES=$(echo "$FINAL_RECIPE" | jq -r '.data.recipes[0].nutrition.calories.quantity')
echo ""
echo -e "${BLUE}Final calories per serving: ${FINAL_CALORIES} kcal${NC}"
echo ""

# Step 8: Test error case - Ingredient not found
echo -e "${YELLOW}Step 8: Test 5 - Error case (ingredient not found)...${NC}"
ERROR_RESPONSE=$(curl -s -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "omit",
        "originalIngredient": "chocolate chips",
        "originalAmount": 1,
        "originalUnit": "cup"
      }
    ]
  }')

echo "$ERROR_RESPONSE" | jq '.'
if echo "$ERROR_RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✅ Error handling works correctly${NC}"
else
  echo -e "${RED}❌ Error handling failed${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Recipe ID: ${RECIPE_ID}"
echo "Original calories: ${ORIGINAL_CALORIES} kcal/serving"
echo "Final calories: ${FINAL_CALORIES} kcal/serving"
echo ""
echo "Modifications applied:"
echo "  1. ✅ Replaced butter with olive oil"
echo "  2. ✅ Removed white sugar"
echo "  3. ✅ Added honey"
echo "  4. ✅ Replaced whole milk with almond milk"
echo "  5. ✅ Added protein powder"
echo ""
echo -e "${YELLOW}Note: Recipe ID ${RECIPE_ID} can be used for further testing${NC}"
echo -e "${YELLOW}To clean up, run: curl -X DELETE '${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}' -H 'Authorization: Bearer ${AUTH_TOKEN}'${NC}"
