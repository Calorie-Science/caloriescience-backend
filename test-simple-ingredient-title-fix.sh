#!/bin/bash

# Test script for simple ingredient title and nutrition update fix
# This test adds a boiled egg, updates its quantity from 1 to 4, and verifies the title and nutrition are updated

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Simple Ingredient Title and Nutrition Update Fix"
echo "=========================================================="

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

# Step 2: Add boiled egg to snack
echo -e "\n${YELLOW}Step 2: Adding boiled egg (1 large) to snack...${NC}"
ADD_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}/recipe" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 1,
    "mealName": "snack",
    "recipeId": "ingredient_boiled_egg",
    "provider": "spoonacular"
  }')

echo "Add response:"
echo $ADD_RESPONSE | jq '.success, .message'

# Step 3: Get initial state
echo -e "\n${YELLOW}Step 3: Getting initial state (before customization)...${NC}"
INITIAL_STATE=$(curl -s -X GET "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}")

INITIAL_TITLE=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].title')
INITIAL_CALORIES=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].calories')
INITIAL_PROTEIN=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].protein')
INITIAL_CARBS=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].carbs')
INITIAL_FAT=$(echo $INITIAL_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].fat')

echo "Initial state:"
echo "  Title: $INITIAL_TITLE"
echo "  Calories: $INITIAL_CALORIES"
echo "  Protein: ${INITIAL_PROTEIN}g"
echo "  Carbs: ${INITIAL_CARBS}g"
echo "  Fat: ${INITIAL_FAT}g"

# Step 4: Update quantity from 1 to 4 using customizations API
echo -e "\n${YELLOW}Step 4: Updating quantity from 1 large to 4 large...${NC}"
CUSTOM_RESPONSE=$(curl -s -X PUT "${BASE_URL}/api/meal-plans/draft/${DRAFT_ID}/day/1/meal/snack/recipe/ingredient_boiled_egg/customizations" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "spoonacular",
    "recipeId": "ingredient_boiled_egg",
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "boiled egg",
        "newIngredient": "boiled egg",
        "amount": 4,
        "unit": "large",
        "notes": "Updated from 1 large boiled egg"
      }
    ]
  }')

echo "Customization response:"
echo $CUSTOM_RESPONSE | jq '.success, .message'

# Step 5: Get updated state and verify
echo -e "\n${YELLOW}Step 5: Getting updated state (after customization)...${NC}"
UPDATED_STATE=$(curl -s -X GET "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}")

UPDATED_TITLE=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].title')
UPDATED_CALORIES=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].calories')
UPDATED_PROTEIN=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].protein')
UPDATED_CARBS=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].carbs')
UPDATED_FAT=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.recipes[0].fat')
CUSTOM_NUTRITION_CALORIES=$(echo $UPDATED_STATE | jq -r '.data.suggestions[0].meals.snack.customizations.ingredient_boiled_egg.customNutrition.calories.quantity')

echo "Updated state:"
echo "  Title: $UPDATED_TITLE"
echo "  Calories: $UPDATED_CALORIES"
echo "  Protein: ${UPDATED_PROTEIN}g"
echo "  Carbs: ${UPDATED_CARBS}g"
echo "  Fat: ${UPDATED_FAT}g"
echo "  CustomNutrition Calories: $CUSTOM_NUTRITION_CALORIES"

# Step 6: Verify results
echo -e "\n${YELLOW}Step 6: Verifying results...${NC}"
ERRORS=0

# Check title update
if [[ "$UPDATED_TITLE" == *"4large"* ]] || [[ "$UPDATED_TITLE" == *"4 large"* ]]; then
  echo -e "${GREEN}✅ Title updated correctly: $UPDATED_TITLE${NC}"
else
  echo -e "${RED}❌ Title not updated: $UPDATED_TITLE (expected to contain '4large' or '4 large')${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check calories match (should be ~292-293 for 4 eggs)
EXPECTED_CALORIES=$(echo "$CUSTOM_NUTRITION_CALORIES" | awk '{printf "%.0f", $1}')
ACTUAL_CALORIES=$(echo "$UPDATED_CALORIES" | awk '{printf "%.0f", $1}')

if [ "$ACTUAL_CALORIES" == "$EXPECTED_CALORIES" ]; then
  echo -e "${GREEN}✅ Calories match customNutrition: $ACTUAL_CALORIES kcal${NC}"
else
  echo -e "${RED}❌ Calories don't match: recipe=$ACTUAL_CALORIES, customNutrition=$EXPECTED_CALORIES${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check if calories are approximately 4x the original (78 * 4 = 312, but actual is ~292-293)
# Allow for some variance in nutrition calculation
MIN_EXPECTED=280
MAX_EXPECTED=320

if (( $(echo "$UPDATED_CALORIES >= $MIN_EXPECTED" | bc -l) )) && (( $(echo "$UPDATED_CALORIES <= $MAX_EXPECTED" | bc -l) )); then
  echo -e "${GREEN}✅ Calories in expected range ($MIN_EXPECTED-$MAX_EXPECTED): $UPDATED_CALORIES kcal${NC}"
else
  echo -e "${RED}❌ Calories out of range: $UPDATED_CALORIES (expected $MIN_EXPECTED-$MAX_EXPECTED)${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check protein is approximately 4x original (6.3 * 4 = 25.2)
if (( $(echo "$UPDATED_PROTEIN >= 20 && $UPDATED_PROTEIN <= 30" | bc -l) )); then
  echo -e "${GREEN}✅ Protein in expected range (20-30g): ${UPDATED_PROTEIN}g${NC}"
else
  echo -e "${RED}❌ Protein out of range: ${UPDATED_PROTEIN}g (expected 20-30g)${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Step 7: Summary
echo -e "\n=========================================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo "The fix correctly updates both the title and nutrition fields for simple ingredients."
else
  echo -e "${RED}❌ $ERRORS test(s) failed${NC}"
  echo "There are still issues with the simple ingredient update functionality."
fi

# Cleanup (optional)
echo -e "\n${YELLOW}Cleanup: Deleting test draft...${NC}"
curl -s -X DELETE "${BASE_URL}/api/meal-plans/manual/${DRAFT_ID}" > /dev/null
echo "Done!"

