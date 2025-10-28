#!/bin/bash

# Test Bon Happetee Ingredients Fix
# This tests that Bon Happetee recipes show ingredients when added to manual meal plans

BASE_URL="http://localhost:3000"
# BASE_URL="https://your-deployment-url.vercel.app"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Bon Happetee Ingredients Test${NC}"
echo -e "${BLUE}================================${NC}\n"

# Set your test credentials here
NUTRITIONIST_EMAIL="your-nutritionist@example.com"
NUTRITIONIST_PASSWORD="your-password"
CLIENT_ID="your-client-uuid"

echo -e "${BLUE}Step 1: Login as Nutritionist${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$NUTRITIONIST_EMAIL\",
    \"password\": \"$NUTRITIONIST_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}\n"

# Test 1: Search for Bon Happetee recipes
echo -e "${BLUE}Step 2: Search for Bon Happetee recipes${NC}"
SEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/recipes/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clientId": "'"$CLIENT_ID"'",
    "query": "paneer",
    "providers": ["bonhappetee"],
    "maxResults": 5
  }')

echo "$SEARCH_RESPONSE" | jq '.data.bonhappetee | .recipes[0:2] | map({id, title, source})'

# Get first recipe ID
BON_RECIPE_ID=$(echo $SEARCH_RESPONSE | jq -r '.data.bonhappetee.recipes[0].id')

if [ "$BON_RECIPE_ID" = "null" ] || [ -z "$BON_RECIPE_ID" ]; then
  echo -e "${RED}❌ No Bon Happetee recipes found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found Bon Happetee recipe: $BON_RECIPE_ID${NC}\n"

# Test 2: Get recipe details to verify ingredients are fetched
echo -e "${BLUE}Step 3: Get recipe details${NC}"
DETAILS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/recipes/$BON_RECIPE_ID/details" \
  -H "Authorization: Bearer $TOKEN")

RECIPE_TITLE=$(echo $DETAILS_RESPONSE | jq -r '.data.title')
INGREDIENTS_COUNT=$(echo $DETAILS_RESPONSE | jq -r '.data.ingredients | length')
HAS_INGREDIENTS=$(echo $DETAILS_RESPONSE | jq -r '.data.ingredients != null and (.data.ingredients | length) > 0')

echo -e "Recipe: ${YELLOW}$RECIPE_TITLE${NC}"
echo -e "Ingredients count: ${YELLOW}$INGREDIENTS_COUNT${NC}"

if [ "$HAS_INGREDIENTS" = "true" ]; then
  echo -e "${GREEN}✅ Recipe has ingredients${NC}"
  echo -e "\nFirst 3 ingredients:"
  echo $DETAILS_RESPONSE | jq '.data.ingredients[0:3] | map({text, food, quantity, measure})'
else
  echo -e "${RED}❌ Recipe has no ingredients${NC}"
fi

# Test 3: Create manual meal plan
echo -e "\n${BLUE}Step 4: Create manual meal plan${NC}"
CREATE_PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans/manual/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"planDate\": \"$(date +%Y-%m-%d)\",
    \"durationDays\": 1
  }")

DRAFT_ID=$(echo $CREATE_PLAN_RESPONSE | jq -r '.data.draftId')

if [ "$DRAFT_ID" = "null" ] || [ -z "$DRAFT_ID" ]; then
  echo -e "${RED}❌ Failed to create manual meal plan${NC}"
  echo $CREATE_PLAN_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Manual meal plan created: $DRAFT_ID${NC}\n"

# Test 4: Add Bon Happetee recipe to manual meal plan
echo -e "${BLUE}Step 5: Add Bon Happetee recipe to meal plan${NC}"
ADD_RECIPE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"lunch\",
    \"recipe\": {
      \"id\": \"$BON_RECIPE_ID\",
      \"provider\": \"bonhappetee\",
      \"source\": \"api\"
    }
  }")

# echo "Full response:" | jq '.'
# echo "$ADD_RECIPE_RESPONSE"

# Verify ingredients are present in the added recipe
ADDED_RECIPE_INGREDIENTS=$(echo $ADD_RECIPE_RESPONSE | jq -r '.data.suggestions[0].meals.lunch.recipes[0].ingredients | length')
ADDED_RECIPE_TITLE=$(echo $ADD_RECIPE_RESPONSE | jq -r '.data.suggestions[0].meals.lunch.recipes[0].title')

echo -e "Added recipe: ${YELLOW}$ADDED_RECIPE_TITLE${NC}"
echo -e "Ingredients in meal plan: ${YELLOW}$ADDED_RECIPE_INGREDIENTS${NC}"

if [ "$ADDED_RECIPE_INGREDIENTS" != "null" ] && [ "$ADDED_RECIPE_INGREDIENTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Recipe has $ADDED_RECIPE_INGREDIENTS ingredients in meal plan${NC}"
  echo -e "\nFirst 3 ingredients from meal plan:"
  echo $ADD_RECIPE_RESPONSE | jq '.data.suggestions[0].meals.lunch.recipes[0].ingredients[0:3] | map({text, food, quantity, measure})'
else
  echo -e "${RED}❌ Recipe has no ingredients in meal plan${NC}"
  echo -e "\nFull recipe data:"
  echo $ADD_RECIPE_RESPONSE | jq '.data.suggestions[0].meals.lunch.recipes[0]'
fi

# Test 5: Get the draft to verify ingredients are persisted
echo -e "\n${BLUE}Step 6: Get draft to verify ingredients are persisted${NC}"
GET_DRAFT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN")

PERSISTED_INGREDIENTS=$(echo $GET_DRAFT_RESPONSE | jq -r '.data.suggestions[0].meals.lunch.recipes[0].ingredients | length')

echo -e "Persisted ingredients count: ${YELLOW}$PERSISTED_INGREDIENTS${NC}"

if [ "$PERSISTED_INGREDIENTS" != "null" ] && [ "$PERSISTED_INGREDIENTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Ingredients persisted correctly ($PERSISTED_INGREDIENTS ingredients)${NC}"
else
  echo -e "${RED}❌ Ingredients not persisted${NC}"
fi

# Summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"

TESTS_PASSED=0
TESTS_TOTAL=3

if [ "$HAS_INGREDIENTS" = "true" ]; then
  echo -e "${GREEN}✅ Recipe details contain ingredients${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Recipe details missing ingredients${NC}"
fi

if [ "$ADDED_RECIPE_INGREDIENTS" != "null" ] && [ "$ADDED_RECIPE_INGREDIENTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Recipe added to meal plan with ingredients${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Recipe added without ingredients${NC}"
fi

if [ "$PERSISTED_INGREDIENTS" != "null" ] && [ "$PERSISTED_INGREDIENTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Ingredients persisted in database${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Ingredients not persisted${NC}"
fi

echo -e "\n${BLUE}Tests Passed: $TESTS_PASSED/$TESTS_TOTAL${NC}"

if [ "$TESTS_PASSED" -eq "$TESTS_TOTAL" ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi

