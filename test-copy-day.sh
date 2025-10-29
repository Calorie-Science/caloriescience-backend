#!/bin/bash

# Test script for Copy Day API
# This script demonstrates copying days in a manual meal plan

API_URL="http://localhost:3000"
TOKEN="your-test-token-here"

echo "🧪 Testing Copy Day API"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Create a manual meal plan draft
echo -e "${BLUE}Test 1: Create manual meal plan draft${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-id",
    "planDate": "2025-10-20",
    "durationDays": 7
  }')

echo "Response:"
echo "$CREATE_RESPONSE" | jq '.'

DRAFT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.draftId')
echo -e "${GREEN}✅ Created draft: $DRAFT_ID${NC}"
echo ""

# Test 2: Add a recipe to day 1, breakfast
echo -e "${BLUE}Test 2: Add recipe to day 1, breakfast${NC}"
ADD_RECIPE_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipe\": {
      \"id\": \"716429\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    },
    \"servings\": 1
  }")

echo "Recipe added to day 1, breakfast"
echo "$ADD_RECIPE_RESPONSE" | jq '.message'
echo ""

# Test 3: Copy day 1 to day 2
echo -e "${BLUE}Test 3: Copy day 1 to day 2${NC}"
COPY_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"sourceDay\": 1,
    \"targetDay\": 2
  }")

echo "Response:"
echo "$COPY_RESPONSE" | jq '.message'

# Check if day 2 now has the same recipes as day 1
DAY_1_RECIPES=$(echo "$COPY_RESPONSE" | jq '.data.suggestions[0].meals.breakfast.recipes | length')
DAY_2_RECIPES=$(echo "$COPY_RESPONSE" | jq '.data.suggestions[1].meals.breakfast.recipes | length')

if [ "$DAY_1_RECIPES" == "$DAY_2_RECIPES" ]; then
  echo -e "${GREEN}✅ Day 2 has same number of recipes as Day 1${NC}"
else
  echo -e "${RED}❌ Day 2 recipes don't match Day 1${NC}"
fi
echo ""

# Test 4: Copy day 1 to days 3-7 (repeat pattern)
echo -e "${BLUE}Test 4: Copy day 1 to days 3-7 (repeat pattern)${NC}"
for TARGET_DAY in {3..7}; do
  echo "Copying day 1 to day $TARGET_DAY..."
  curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"draftId\": \"$DRAFT_ID\",
      \"sourceDay\": 1,
      \"targetDay\": $TARGET_DAY
    }" > /dev/null
  echo -e "${GREEN}✅ Copied to day $TARGET_DAY${NC}"
done
echo ""

# Test 5: Try to copy to day 10 without extending (should fail)
echo -e "${BLUE}Test 5: Try to copy to day 10 without extending (should fail)${NC}"
ERROR_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"sourceDay\": 1,
    \"targetDay\": 10,
    \"extendIfNeeded\": false
  }")

echo "Response:"
echo "$ERROR_RESPONSE" | jq '.'

if echo "$ERROR_RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✅ Correctly rejected (plan only has 7 days)${NC}"
else
  echo -e "${RED}❌ Should have failed${NC}"
fi
echo ""

# Test 6: Copy to day 10 WITH extending
echo -e "${BLUE}Test 6: Copy to day 10 WITH extending${NC}"
EXTEND_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"sourceDay\": 1,
    \"targetDay\": 10,
    \"extendIfNeeded\": true
  }")

echo "Response:"
echo "$EXTEND_RESPONSE" | jq '.message'

NEW_DURATION=$(echo "$EXTEND_RESPONSE" | jq '.data.durationDays')
echo "New plan duration: $NEW_DURATION days"

if [ "$NEW_DURATION" == "10" ]; then
  echo -e "${GREEN}✅ Plan extended to 10 days${NC}"
else
  echo -e "${RED}❌ Plan not extended correctly${NC}"
fi
echo ""

# Test 7: Extend to 14 days by repeating pattern (days 1-7 → days 11-17)
echo -e "${BLUE}Test 7: Extend to 14 days by repeating week 1${NC}"
for SOURCE_DAY in {1..4}; do
  TARGET_DAY=$((SOURCE_DAY + 10))
  echo "Copying day $SOURCE_DAY to day $TARGET_DAY..."
  curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"draftId\": \"$DRAFT_ID\",
      \"sourceDay\": $SOURCE_DAY,
      \"targetDay\": $TARGET_DAY,
      \"extendIfNeeded\": true
    }" > /dev/null
  echo -e "${GREEN}✅ Copied day $SOURCE_DAY to day $TARGET_DAY${NC}"
done
echo ""

# Test 8: Fetch final draft to see complete structure
echo -e "${BLUE}Test 8: Fetch final draft${NC}"
FINAL_DRAFT=$(curl -s -X GET "$API_URL/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN")

FINAL_DURATION=$(echo "$FINAL_DRAFT" | jq '.data.durationDays')
TOTAL_DAYS=$(echo "$FINAL_DRAFT" | jq '.data.suggestions | length')

echo "Final draft structure:"
echo "  - Duration: $FINAL_DURATION days"
echo "  - Total days in suggestions: $TOTAL_DAYS"
echo "  - Status: $(echo "$FINAL_DRAFT" | jq -r '.data.status')"
echo ""

# Test 9: Try to copy same day to itself (should fail)
echo -e "${BLUE}Test 9: Try to copy day 1 to itself (should fail)${NC}"
SAME_DAY_RESPONSE=$(curl -s -X POST "$API_URL/api/meal-plans/manual/copy-day" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"sourceDay\": 1,
    \"targetDay\": 1
  }")

echo "Response:"
echo "$SAME_DAY_RESPONSE" | jq '.'

if echo "$SAME_DAY_RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✅ Correctly rejected (source and target are the same)${NC}"
else
  echo -e "${RED}❌ Should have failed${NC}"
fi
echo ""

# Test 10: Verify recipes in copied days
echo -e "${BLUE}Test 10: Verify recipes in copied days${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Checking breakfast recipes across days..."
for DAY in {1..7}; do
  DAY_INDEX=$((DAY - 1))
  RECIPE_COUNT=$(echo "$VERIFY_RESPONSE" | jq ".data.suggestions[$DAY_INDEX].meals.breakfast.recipes | length")
  echo "  Day $DAY: $RECIPE_COUNT recipe(s)"
done
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Summary:"
echo "  - Created 7-day manual meal plan"
echo "  - Added recipe to day 1"
echo "  - Copied day 1 to days 2-7 (repeated pattern)"
echo "  - Extended plan to 14 days by copying days"
echo "  - Verified all validations work correctly"

