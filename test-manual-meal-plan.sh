#!/bin/bash

# Manual Meal Plan API Test Script
# This script demonstrates the complete workflow for creating a manual meal plan

# Configuration
API_BASE_URL="http://localhost:3000"
# Replace with your actual JWT token
JWT_TOKEN="your-jwt-token-here"

echo "🧪 Manual Meal Plan API Test Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create a manual meal plan draft
echo -e "${BLUE}Test 1: Create Manual Meal Plan Draft${NC}"
echo "--------------------------------------"
DRAFT_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "clientId": "your-client-uuid",
    "planDate": "2025-10-20",
    "durationDays": 7
  }')

echo "$DRAFT_RESPONSE" | jq '.'
DRAFT_ID=$(echo "$DRAFT_RESPONSE" | jq -r '.data.draftId')
echo -e "${GREEN}✅ Draft ID: ${DRAFT_ID}${NC}"
echo ""
sleep 2

# Test 2: Add recipe from Spoonacular (API source)
echo -e "${BLUE}Test 2: Add Recipe from Spoonacular${NC}"
echo "--------------------------------------"
ADD_RECIPE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipe\": {
      \"id\": \"663959\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    },
    \"servings\": 1
  }")

echo "$ADD_RECIPE_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Recipe added to breakfast, day 1${NC}"
echo ""
sleep 2

# Test 3: Add another recipe (lunch)
echo -e "${BLUE}Test 3: Add Recipe to Lunch${NC}"
echo "--------------------------------------"
curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"lunch\",
    \"recipe\": {
      \"id\": \"715594\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }" | jq '.'
echo -e "${GREEN}✅ Recipe added to lunch, day 1${NC}"
echo ""
sleep 2

# Test 4: Modify recipe ingredients
echo -e "${BLUE}Test 4: Modify Recipe Ingredients${NC}"
echo "--------------------------------------"
curl -s -X PUT "${API_BASE_URL}/api/meal-plans/draft" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"action\": \"update-customizations\",
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipeId\": \"663959\",
    \"customizations\": {
      \"source\": \"spoonacular\",
      \"servings\": 1,
      \"modifications\": [
        {
          \"type\": \"replace\",
          \"originalIngredient\": \"butter\",
          \"newIngredient\": \"olive oil\",
          \"amount\": 2,
          \"unit\": \"tbsp\"
        },
        {
          \"type\": \"omit\",
          \"originalIngredient\": \"sugar\"
        }
      ]
    },
    \"autoCalculateNutrition\": true
  }" | jq '.data.modifiedNutrition'
echo -e "${GREEN}✅ Ingredients modified${NC}"
echo ""
sleep 2

# Test 5: Get draft details
echo -e "${BLUE}Test 5: Get Draft Details${NC}"
echo "--------------------------------------"
curl -s -X GET "${API_BASE_URL}/api/meal-plans/manual/${DRAFT_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" | jq '{
    id: .data.id,
    status: .data.status,
    creationMethod: .data.creationMethod,
    durationDays: .data.durationDays,
    dayCount: (.data.suggestions | length),
    day1Meals: .data.suggestions[0].meals | keys
  }'
echo -e "${GREEN}✅ Draft details retrieved${NC}"
echo ""
sleep 2

# Test 6: Remove recipe
echo -e "${BLUE}Test 6: Remove Recipe${NC}"
echo "--------------------------------------"
curl -s -X DELETE "${API_BASE_URL}/api/meal-plans/manual/remove-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"lunch\"
  }" | jq '.'
echo -e "${GREEN}✅ Recipe removed from lunch${NC}"
echo ""
sleep 2

# Test 7: Try to finalize (should fail - not all meals have recipes)
echo -e "${BLUE}Test 7: Try to Finalize (Expected to Fail)${NC}"
echo "--------------------------------------"
FINALIZE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/finalize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"planName\": \"Test Weekly Plan\"
  }")

echo "$FINALIZE_RESPONSE" | jq '.'
if echo "$FINALIZE_RESPONSE" | jq -e '.error' > /dev/null; then
  echo -e "${YELLOW}⚠️  Finalization failed as expected (incomplete plan)${NC}"
else
  echo -e "${GREEN}✅ Plan finalized${NC}"
fi
echo ""

# Test 8: Add recipes to all remaining meal slots (to allow finalization)
echo -e "${BLUE}Test 8: Fill All Meal Slots${NC}"
echo "--------------------------------------"
echo "Adding recipes to all remaining meal slots for day 1..."

# Re-add lunch
curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"lunch\",
    \"recipe\": {
      \"id\": \"715594\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }" > /dev/null

# Add dinner
curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"dinner\",
    \"recipe\": {
      \"id\": \"716429\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }" > /dev/null

# Add snack
curl -s -X POST "${API_BASE_URL}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"snack\",
    \"recipe\": {
      \"id\": \"716627\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }" > /dev/null

echo -e "${GREEN}✅ All day 1 meal slots filled${NC}"
echo ""
echo -e "${YELLOW}Note: Days 2-7 still need recipes for full finalization${NC}"
echo ""

# Summary
echo -e "${BLUE}Test Summary${NC}"
echo "--------------------------------------"
echo -e "Draft ID: ${YELLOW}${DRAFT_ID}${NC}"
echo -e "Status: ${YELLOW}draft${NC}"
echo -e "Creation Method: ${YELLOW}manual${NC}"
echo ""
echo "Next steps:"
echo "1. Add recipes to remaining days (2-7)"
echo "2. Finalize the plan with: POST /api/meal-plans/manual/finalize"
echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"

