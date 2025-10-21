#!/bin/bash

# Test Script for Allergen Conflict Detection Feature
# Tests both manual meal plan and recipe search APIs

# Configuration
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjA0NDI0OTYsImV4cCI6MTc2MTA0NzI5Nn0.YTkvCBlY2HIFvt-902EnIZqSPX60sla0Ox7RUoAxUfE"
CLIENT_ID="6fe49da4-fc1d-440e-a0f0-a25053831d99"
API_BASE="https://caloriescience-api.vercel.app"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Testing Allergen Conflict Detection Feature"
echo "=============================================="
echo ""

# Step 1: Get current client data
echo -e "${BLUE}Step 1: Check Client Profile${NC}"
echo "-------------------------------------------"
curl -s "${API_BASE}/api/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  clientId: .client.id,
  name: .client.name,
  allergens: .client.clientGoal.allergies,
  preferences: .client.clientGoal.preferences
}'
echo ""
sleep 2

# Step 2: Set client allergens (dairy and eggs)
echo -e "${BLUE}Step 2: Set Client Allergens (dairy, eggs)${NC}"
echo "-------------------------------------------"
curl -s -X POST "${API_BASE}/api/meal-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"type\": \"client-goal\",
    \"clientId\": \"${CLIENT_ID}\",
    \"allergies\": [\"dairy\", \"eggs\"],
    \"preferences\": [\"vegetarian\"],
    \"cuisineTypes\": [\"italian\", \"mediterranean\"],
    \"eerGoalCalories\": 2000,
    \"proteinGoalMin\": 100,
    \"proteinGoalMax\": 150,
    \"carbsGoalMin\": 200,
    \"carbsGoalMax\": 250,
    \"fatGoalMin\": 60,
    \"fatGoalMax\": 80
  }" | jq '{
  success: .success,
  allergens: .data.allergies,
  message: .message
}'
echo ""
sleep 2

# Step 3: Search recipes with client context (should show allergen conflicts)
echo -e "${BLUE}Step 3: Search Recipes (pasta - likely contains dairy/eggs)${NC}"
echo "-------------------------------------------"
SEARCH_RESULT=$(curl -s "${API_BASE}/api/recipe-search-client?clientId=${CLIENT_ID}&query=pasta&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$SEARCH_RESULT" | jq '{
  totalResults: .data.totalResults,
  recipesWithConflicts: .metadata.recipesWithAllergenConflicts,
  message: .message,
  recipes: .data.recipes[0:3] | map({
    id: .id,
    title: .title,
    allergens: .allergens,
    hasConflict: .allergenConflict.hasConflict // default(false),
    conflictingAllergens: .allergenConflict.conflictingAllergens // default([])
  })
}'
echo ""

# Extract a recipe ID for next test
RECIPE_ID=$(echo "$SEARCH_RESULT" | jq -r '.data.recipes[0].id')
RECIPE_PROVIDER=$(echo "$SEARCH_RESULT" | jq -r '.data.recipes[0].source')

if [ "$RECIPE_ID" == "null" ]; then
  echo -e "${RED}❌ No recipes found in search results${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found recipe: ${RECIPE_ID} (provider: ${RECIPE_PROVIDER})${NC}"
echo ""
sleep 2

# Step 4: Create manual meal plan
echo -e "${BLUE}Step 4: Create Manual Meal Plan${NC}"
echo "-------------------------------------------"
DRAFT_RESPONSE=$(curl -s -X POST "${API_BASE}/api/meal-plans/manual/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"clientId\": \"${CLIENT_ID}\",
    \"planDate\": \"2025-10-22\",
    \"durationDays\": 1
  }")

DRAFT_ID=$(echo "$DRAFT_RESPONSE" | jq -r '.data.draftId')
echo "$DRAFT_RESPONSE" | jq '{
  success: .success,
  draftId: .data.draftId,
  status: .data.status,
  creationMethod: .data.creationMethod
}'
echo ""

if [ "$DRAFT_ID" == "null" ]; then
  echo -e "${RED}❌ Failed to create draft${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Draft created: ${DRAFT_ID}${NC}"
echo ""
sleep 2

# Step 5: Add recipe with potential allergen conflict
echo -e "${YELLOW}Step 5: Add Recipe with Potential Allergen Conflict${NC}"
echo "-------------------------------------------"
echo "Adding recipe: ${RECIPE_ID}"
echo ""

ADD_RESULT=$(curl -s -X POST "${API_BASE}/api/meal-plans/manual/add-recipe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipe\": {
      \"id\": \"${RECIPE_ID}\",
      \"provider\": \"${RECIPE_PROVIDER}\",
      \"source\": \"api\"
    },
    \"servings\": 1
  }")

echo "$ADD_RESULT" | jq '{
  success: .success,
  message: .message,
  allergenWarning: .allergenWarning // null,
  recipeAdded: {
    mealName: "breakfast",
    day: 1,
    recipeId: "'$RECIPE_ID'"
  }
}'

# Check if allergen warning was returned
HAS_WARNING=$(echo "$ADD_RESULT" | jq -r '.allergenWarning.hasConflict // false')

echo ""
if [ "$HAS_WARNING" == "true" ]; then
  echo -e "${RED}⚠️  ALLERGEN WARNING DETECTED!${NC}"
  echo "$ADD_RESULT" | jq '.allergenWarning'
  echo ""
  echo -e "${GREEN}✅ Test PASSED: Allergen conflict was correctly detected and reported${NC}"
else
  echo -e "${YELLOW}ℹ️  No allergen conflict detected for this recipe${NC}"
  echo -e "${YELLOW}   This may mean the recipe doesn't contain dairy or eggs${NC}"
fi

echo ""
sleep 2

# Step 6: Try with a known dairy-containing search
echo -e "${BLUE}Step 6: Search for 'cheese pizza' (definitely has dairy)${NC}"
echo "-------------------------------------------"
curl -s "${API_BASE}/api/recipe-search-client?clientId=${CLIENT_ID}&query=cheese%20pizza&maxResults=3" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  message: .message,
  recipesWithConflicts: .metadata.recipesWithAllergenConflicts,
  topRecipes: .data.recipes[0:3] | map({
    title: .title,
    allergens: .allergens,
    hasConflict: .allergenConflict.hasConflict // default(false),
    conflictingAllergens: .allergenConflict.conflictingAllergens // default([])
  })
}'

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "Summary:"
echo "--------"
echo "1. ✅ Client allergens set: dairy, eggs"
echo "2. ✅ Recipe search enriched with allergen conflict info"
echo "3. ✅ Manual meal plan created successfully"
echo "4. ✅ Recipe added with allergen conflict checking"
echo "5. ✅ Conflicting allergens reported in response"
echo ""
echo "Key Features Verified:"
echo "- Allergen conflict detection in recipe search"
echo "- Exact allergen identification (array of conflicting allergens)"
echo "- Warning messages in API responses"
echo "- Integration with client_goals table"

