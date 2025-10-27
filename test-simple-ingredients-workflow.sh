#!/bin/bash

# Test script for simple ingredients workflow
# Tests: search → add → get → customize → delete

# IMPORTANT: Replace these with your actual values
BASE_URL="https://caloriescience-api.vercel.app"
#BASE_URL="http://localhost:3000"
AUTH_TOKEN="YOUR_TOKEN_HERE"
CLIENT_ID="YOUR_CLIENT_ID"
DRAFT_ID="YOUR_DRAFT_ID"

echo "=================================================="
echo "SIMPLE INGREDIENTS WORKFLOW TEST"
echo "=================================================="
echo ""

# Test 1: Search for apple
echo "Test 1: Searching for 'apple'..."
echo "--------------------------------------------------"
APPLE_SEARCH=$(curl -s "${BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=apple&maxResults=5" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

echo "$APPLE_SEARCH" | jq '{
  success: .success,
  ingredientCount: .data.ingredientRecipesCount,
  firstIngredient: .data.recipes[0] | {
    id,
    title,
    isSimpleIngredient,
    isIngredient,
    calories,
    protein
  }
}'

APPLE_ID=$(echo "$APPLE_SEARCH" | jq -r '.data.recipes[0].id')
echo ""
echo "Apple ID: $APPLE_ID"
echo ""

# Test 2: Add apple to meal plan
echo "Test 2: Adding apple to meal plan..."
echo "--------------------------------------------------"
ADD_APPLE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipe\": {
      \"id\": \"${APPLE_ID}\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }")

echo "$ADD_APPLE" | jq '{
  success: .success,
  message: .message
}'
echo ""

# Test 3: Get draft and verify apple is there
echo "Test 3: Getting draft to verify apple..."
echo "--------------------------------------------------"
DRAFT_AFTER_APPLE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/draft" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"action\": \"get-draft\",
    \"draftId\": \"${DRAFT_ID}\"
  }")

echo "$DRAFT_AFTER_APPLE" | jq '.data.suggestions[0].meals.snack | {
  recipeCount: (.recipes | length),
  recipes: .recipes | map({
    id,
    title,
    isSimpleIngredient,
    isIngredient,
    calories
  })
}'
echo ""

# Test 4: Search for mango
echo "Test 4: Searching for 'mango'..."
echo "--------------------------------------------------"
MANGO_SEARCH=$(curl -s "${BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=mango&maxResults=5" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

MANGO_ID=$(echo "$MANGO_SEARCH" | jq -r '.data.recipes[0].id')
echo "Mango ID: $MANGO_ID"
echo ""

# Test 5: Add mango to same meal
echo "Test 5: Adding mango to same meal..."
echo "--------------------------------------------------"
ADD_MANGO=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipe\": {
      \"id\": \"${MANGO_ID}\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }")

echo "$ADD_MANGO" | jq '{
  success: .success,
  message: .message
}'
echo ""

# Test 6: Get draft and verify both are there
echo "Test 6: Getting draft to verify both ingredients..."
echo "--------------------------------------------------"
DRAFT_AFTER_MANGO=$(curl -s -X POST "${BASE_URL}/api/meal-plans/draft" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"action\": \"get-draft\",
    \"draftId\": \"${DRAFT_ID}\"
  }")

echo "$DRAFT_AFTER_MANGO" | jq '.data.suggestions[0].meals.snack | {
  recipeCount: (.recipes | length),
  recipes: .recipes | map({
    id,
    title,
    isSimpleIngredient,
    calories
  })
}'
echo ""

# Test 7: Customize apple (change quantity)
echo "Test 7: Customizing apple (1 medium → 2 medium)..."
echo "--------------------------------------------------"
CUSTOMIZE_APPLE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/draft" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"action\": \"update-customizations\",
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipeId\": \"${APPLE_ID}\",
    \"customizations\": {
      \"recipeId\": \"${APPLE_ID}\",
      \"source\": \"spoonacular\",
      \"modifications\": [{
        \"type\": \"replace\",
        \"originalIngredient\": \"apple\",
        \"originalIngredientName\": \"apple\",
        \"originalAmount\": 1,
        \"originalUnit\": \"medium\",
        \"newIngredient\": \"apple\",
        \"amount\": 2,
        \"unit\": \"medium\",
        \"notes\": \"Doubled the apple\"
      }]
    }
  }")

echo "$CUSTOMIZE_APPLE" | jq '{
  success: .success,
  message: .message,
  customNutrition: .data.customizations.customNutrition | {
    calories: .calories.quantity,
    protein: .macros.protein.quantity
  }
}'
echo ""

# Test 8: Get draft after customization
echo "Test 8: Getting draft after customization..."
echo "--------------------------------------------------"
DRAFT_AFTER_CUSTOM=$(curl -s -X POST "${BASE_URL}/api/meal-plans/draft" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"action\": \"get-draft\",
    \"draftId\": \"${DRAFT_ID}\"
  }")

echo "$DRAFT_AFTER_CUSTOM" | jq '.data.suggestions[0].meals.snack | {
  totalNutrition: {
    calories: .totalNutrition.calories.quantity,
    protein: .totalNutrition.macros.protein.quantity
  },
  appleCustomizations: .customizations["'${APPLE_ID}'"] | {
    applied: .customizationsApplied,
    modCount: (.modifications | length),
    calories: .customNutrition.calories.quantity
  }
}'
echo ""

# Test 9: Delete mango
echo "Test 9: Deleting mango..."
echo "--------------------------------------------------"
DELETE_MANGO=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/remove-recipe" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipeId\": \"${MANGO_ID}\"
  }")

echo "$DELETE_MANGO" | jq '{
  success: .success,
  message: .message
}'
echo ""

# Test 10: Get final draft
echo "Test 10: Getting final draft (only apple should remain)..."
echo "--------------------------------------------------"
FINAL_DRAFT=$(curl -s -X POST "${BASE_URL}/api/meal-plans/draft" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"action\": \"get-draft\",
    \"draftId\": \"${DRAFT_ID}\"
  }")

echo "$FINAL_DRAFT" | jq '.data.suggestions[0].meals.snack | {
  recipeCount: (.recipes | length),
  recipes: .recipes | map({
    id,
    title,
    calories
  }),
  customizations: .customizations | keys
}'
echo ""

# Test 11: Delete apple
echo "Test 11: Deleting apple..."
echo "--------------------------------------------------"
DELETE_APPLE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/remove-recipe" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipeId\": \"${APPLE_ID}\"
  }")

echo "$DELETE_APPLE" | jq '{
  success: .success,
  message: .message
}'
echo ""

echo "=================================================="
echo "TEST COMPLETE"
echo "=================================================="

