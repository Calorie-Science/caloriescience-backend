#!/bin/bash

# Test script for simple ingredient servings parameter
# Tests both approaches: servings parameter (new) and replace modification (old)

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🧪 Testing Simple Ingredient Servings Parameter"
echo "================================================"

# Step 1: Create a manual meal plan draft
echo -e "\n${YELLOW}Step 1: Creating manual meal plan draft...${NC}"
DRAFT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual" \
  -H "Content-Type: application/json" \
  -d '{
    "nutritionistId": "test-nutritionist-123",
    "clientId": "test-client-456",
    "startDate": "2025-11-01",
    "endDate": "2025-11-07",
    "clientGoals": {
      "dailyCalories": 2000,
      "proteinG": 150,
      "carbsG": 200,
      "fatG": 65
    }
  }')

DRAFT_ID=$(echo $DRAFT_RESPONSE | jq -r '.data.draftId')
echo "Draft ID: $DRAFT_ID"

if [ "$DRAFT_ID" == "null" ] || [ -z "$DRAFT_ID" ]; then
  echo -e "${RED}❌ Failed to create draft${NC}"
  echo $DRAFT_RESPONSE | jq '.'
  exit 1
fi

# =============================================================================
# TEST 1: Using servings parameter (NEW APPROACH - Cleaner)
# =============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 1: Using servings parameter (NEW)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# Step 2: Add boiled egg to breakfast
echo -e "\n${YELLOW}Step 2: Adding boiled egg (1 large) to breakfast...${NC}"
ADD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}/recipe" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "ingredient_boiled_egg",
    "provider": "spoonacular"
  }')

echo "Add response: $(echo $ADD_RESPONSE | jq -r '.message')"

# Step 3: Get initial state
echo -e "\n${YELLOW}Step 3: Getting initial state...${NC}"
INITIAL_STATE=$(curl -s -X GET "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}")

INITIAL_TITLE=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].title')
INITIAL_CALORIES=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].calories')
INITIAL_PROTEIN=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].protein')

echo "Initial:"
echo "  Title: $INITIAL_TITLE"
echo "  Calories: $INITIAL_CALORIES kcal"
echo "  Protein: ${INITIAL_PROTEIN}g"

# Step 4: Update servings from 1 to 4
echo -e "\n${YELLOW}Step 4: Updating servings from 1 to 4...${NC}"
CUSTOM_RESPONSE=$(curl -s -X PUT "${BASE_URL}/api/meal-plans/draft/${DRAFT_ID}/day/1/meal/breakfast/recipe/ingredient_boiled_egg/customizations" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "spoonacular",
    "recipeId": "ingredient_boiled_egg",
    "servings": 4,
    "modifications": []
  }')

echo "Response: $(echo $CUSTOM_RESPONSE | jq -r '.message')"

# Step 5: Verify updated state
echo -e "\n${YELLOW}Step 5: Verifying updated state...${NC}"
UPDATED_STATE=$(curl -s -X GET "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}")

UPDATED_TITLE=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].title')
UPDATED_CALORIES=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].calories')
UPDATED_PROTEIN=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.breakfast.recipes[0].protein')
CUSTOM_CALORIES=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.breakfast.customizations.ingredient_boiled_egg.customNutrition.calories.quantity')

echo "Updated:"
echo "  Title: $UPDATED_TITLE"
echo "  Calories: $UPDATED_CALORIES kcal"
echo "  Protein: ${UPDATED_PROTEIN}g"
echo "  CustomNutrition Calories: $CUSTOM_CALORIES kcal"

# Verify TEST 1
ERRORS_TEST1=0

if [[ "$UPDATED_TITLE" == *"4"* ]]; then
  echo -e "${GREEN}✅ Title updated to show 4 servings${NC}"
else
  echo -e "${RED}❌ Title not updated: $UPDATED_TITLE${NC}"
  ERRORS_TEST1=$((ERRORS_TEST1 + 1))
fi

EXPECTED_CALORIES=$(echo "$INITIAL_CALORIES * 4" | bc)
if (( $(echo "$UPDATED_CALORIES >= 280 && $UPDATED_CALORIES <= 320" | bc -l) )); then
  echo -e "${GREEN}✅ Calories multiplied correctly (4x): $UPDATED_CALORIES kcal${NC}"
else
  echo -e "${RED}❌ Calories not multiplied correctly: $UPDATED_CALORIES (expected ~312)${NC}"
  ERRORS_TEST1=$((ERRORS_TEST1 + 1))
fi

if [ "$(echo $UPDATED_CALORIES | awk '{printf "%.0f", $1}')" == "$(echo $CUSTOM_CALORIES | awk '{printf "%.0f", $1}')" ]; then
  echo -e "${GREEN}✅ Recipe calories match customNutrition${NC}"
else
  echo -e "${RED}❌ Recipe calories don't match customNutrition${NC}"
  ERRORS_TEST1=$((ERRORS_TEST1 + 1))
fi

# =============================================================================
# TEST 2: Using replace modification (OLD APPROACH - Still supported)
# =============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST 2: Using replace modification (OLD)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# Step 6: Add another boiled egg to snack
echo -e "\n${YELLOW}Step 6: Adding boiled egg (1 large) to snack...${NC}"
ADD_RESPONSE2=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}/recipe" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 1,
    "mealName": "snack",
    "recipeId": "ingredient_boiled_egg",
    "provider": "spoonacular"
  }')

echo "Add response: $(echo $ADD_RESPONSE2 | jq -r '.message')"

# Step 7: Update using replace modification
echo -e "\n${YELLOW}Step 7: Updating quantity using replace modification (1 → 3)...${NC}"
CUSTOM_RESPONSE2=$(curl -s -X PUT "${BASE_URL}/api/meal-plans/draft/${DRAFT_ID}/day/1/meal/snack/recipe/ingredient_boiled_egg/customizations" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "spoonacular",
    "recipeId": "ingredient_boiled_egg",
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "boiled egg",
        "newIngredient": "boiled egg",
        "amount": 3,
        "unit": "large",
        "notes": "Updated from 1 to 3 eggs"
      }
    ]
  }')

echo "Response: $(echo $CUSTOM_RESPONSE2 | jq -r '.message')"

# Step 8: Verify
echo -e "\n${YELLOW}Step 8: Verifying replace modification approach...${NC}"
UPDATED_STATE2=$(curl -s -X GET "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}")

SNACK_TITLE=$(echo $UPDATED_STATE2 | jq -r '.data.suggestions[0].meals.snack.recipes[0].title')
SNACK_CALORIES=$(echo $UPDATED_STATE2 | jq -r '.data.suggestions[0].meals.snack.recipes[0].calories')
SNACK_PROTEIN=$(echo $UPDATED_STATE2 | jq -r '.data.suggestions[0].meals.snack.recipes[0].protein')

echo "Updated:"
echo "  Title: $SNACK_TITLE"
echo "  Calories: $SNACK_CALORIES kcal"
echo "  Protein: ${SNACK_PROTEIN}g"

# Verify TEST 2
ERRORS_TEST2=0

if [[ "$SNACK_TITLE" == *"3"* ]]; then
  echo -e "${GREEN}✅ Title updated to show 3 eggs${NC}"
else
  echo -e "${RED}❌ Title not updated: $SNACK_TITLE${NC}"
  ERRORS_TEST2=$((ERRORS_TEST2 + 1))
fi

if (( $(echo "$SNACK_CALORIES >= 210 && $SNACK_CALORIES <= 250" | bc -l) )); then
  echo -e "${GREEN}✅ Calories correct for 3 eggs: $SNACK_CALORIES kcal${NC}"
else
  echo -e "${RED}❌ Calories incorrect: $SNACK_CALORIES (expected ~234)${NC}"
  ERRORS_TEST2=$((ERRORS_TEST2 + 1))
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

TOTAL_ERRORS=$((ERRORS_TEST1 + ERRORS_TEST2))

if [ $TOTAL_ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Both approaches work correctly:"
  echo "  1. ✅ Servings parameter (NEW): Clean and simple"
  echo "  2. ✅ Replace modification (OLD): Still supported"
else
  echo -e "${RED}❌ $TOTAL_ERRORS test(s) failed${NC}"
  echo "  Test 1 (servings): $ERRORS_TEST1 errors"
  echo "  Test 2 (replace): $ERRORS_TEST2 errors"
fi

# Cleanup
echo -e "\n${YELLOW}Cleanup: Deleting test draft...${NC}"
curl -s -X DELETE "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}" > /dev/null
echo "Done!"

