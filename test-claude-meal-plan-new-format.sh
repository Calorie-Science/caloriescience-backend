#!/bin/bash

# Test Claude AI Meal Plan with New Format
# Tests the updated prompt that returns manual/automated format directly

BASE_URL="http://localhost:3000"
# BASE_URL="https://your-deployment-url.vercel.app"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Claude AI Meal Plan - New Format Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# REPLACE THESE WITH YOUR CREDENTIALS
NUTRITIONIST_EMAIL="your-nutritionist@example.com"
NUTRITIONIST_PASSWORD="your-password"
CLIENT_ID="your-client-uuid"

echo -e "${YELLOW}⚠️  Please update the script with your credentials:${NC}"
echo -e "   - NUTRITIONIST_EMAIL"
echo -e "   - NUTRITIONIST_PASSWORD"
echo -e "   - CLIENT_ID\n"

read -p "Press Enter to continue or Ctrl+C to exit..."

echo -e "\n${BLUE}Step 1: Login as Nutritionist${NC}"
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

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "Token: ${TOKEN:0:20}...\n"

# Test: Generate Claude AI Meal Plan
echo -e "${BLUE}Step 2: Generate Claude AI Meal Plan${NC}"
echo -e "${YELLOW}Sending request...${NC}\n"

AI_PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"meal-plan\",
    \"action\": \"async-generate\",
    \"clientId\": \"$CLIENT_ID\",
    \"additionalText\": \"Focus on high-protein vegetarian meals with Indian cuisine\",
    \"days\": 7,
    \"startDate\": \"$(date +%Y-%m-%d)\"
  }")

# Save full response to file for inspection
echo "$AI_PLAN_RESPONSE" > claude_meal_plan_response.json
echo -e "${GREEN}✅ Full response saved to: claude_meal_plan_response.json${NC}\n"

# Check if response is successful
SUCCESS=$(echo $AI_PLAN_RESPONSE | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Request failed${NC}"
  echo $AI_PLAN_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Request successful${NC}\n"

# Validation: Check for new format fields
echo -e "${BLUE}Step 3: Validate Response Format${NC}\n"

# Check top-level fields
HAS_SUGGESTIONS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions != null')
HAS_NUTRITION=$(echo $AI_PLAN_RESPONSE | jq -r '.data.nutrition != null')
HAS_SEARCH_PARAMS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.searchParams != null')
HAS_COMPLETION=$(echo $AI_PLAN_RESPONSE | jq -r '.data.completionPercentage != null')
CREATION_METHOD=$(echo $AI_PLAN_RESPONSE | jq -r '.data.creationMethod')
STATUS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.status')

# Check nutrition structure
HAS_BY_DAY=$(echo $AI_PLAN_RESPONSE | jq -r '.data.nutrition.byDay != null')
HAS_OVERALL=$(echo $AI_PLAN_RESPONSE | jq -r '.data.nutrition.overall != null')
HAS_DAILY_AVG=$(echo $AI_PLAN_RESPONSE | jq -r '.data.nutrition.dailyAverage != null')

# Check suggestions structure
NUM_DAYS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions | length')
FIRST_DAY_MEALS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions[0].meals | keys | length')
FIRST_MEAL_NAME=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions[0].meals | keys[0]')

echo -e "${BLUE}=== Top-Level Fields ===${NC}"
if [ "$HAS_SUGGESTIONS" = "true" ]; then
  echo -e "${GREEN}✅ Has suggestions array${NC}"
else
  echo -e "${RED}❌ Missing suggestions array${NC}"
fi

if [ "$HAS_NUTRITION" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition object${NC}"
else
  echo -e "${RED}❌ Missing nutrition object${NC}"
fi

if [ "$HAS_SEARCH_PARAMS" = "true" ]; then
  echo -e "${GREEN}✅ Has searchParams${NC}"
else
  echo -e "${RED}❌ Missing searchParams${NC}"
fi

if [ "$HAS_COMPLETION" = "true" ]; then
  COMPLETION_PCT=$(echo $AI_PLAN_RESPONSE | jq -r '.data.completionPercentage')
  echo -e "${GREEN}✅ Has completionPercentage: $COMPLETION_PCT%${NC}"
else
  echo -e "${RED}❌ Missing completionPercentage${NC}"
fi

echo -e "\n${BLUE}=== Metadata ===${NC}"
echo -e "Creation Method: ${CREATION_METHOD}"
echo -e "Status: ${STATUS}"

echo -e "\n${BLUE}=== Nutrition Structure ===${NC}"
if [ "$HAS_BY_DAY" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition.byDay${NC}"
else
  echo -e "${RED}❌ Missing nutrition.byDay${NC}"
fi

if [ "$HAS_OVERALL" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition.overall${NC}"
else
  echo -e "${RED}❌ Missing nutrition.overall${NC}"
fi

if [ "$HAS_DAILY_AVG" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition.dailyAverage${NC}"
else
  echo -e "${RED}❌ Missing nutrition.dailyAverage${NC}"
fi

echo -e "\n${BLUE}=== Suggestions Structure ===${NC}"
echo -e "Number of days: ${NUM_DAYS}"
echo -e "Meals in first day: ${FIRST_DAY_MEALS}"
echo -e "First meal name: ${FIRST_MEAL_NAME}"

# Check if meals are objects (not arrays)
MEALS_IS_OBJECT=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions[0].meals | type')
if [ "$MEALS_IS_OBJECT" = "object" ]; then
  echo -e "${GREEN}✅ Meals are objects (correct format)${NC}"
else
  echo -e "${RED}❌ Meals are not objects (should be objects, not arrays)${NC}"
fi

# Check first meal structure
echo -e "\n${BLUE}=== First Meal Structure ===${NC}"
HAS_RECIPES=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes != null")
HAS_TOTAL_NUTRITION=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.totalNutrition != null")
HAS_MEAL_TIME=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.mealTime != null")
HAS_TARGET_CALORIES=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.targetCalories != null")

if [ "$HAS_RECIPES" = "true" ]; then
  NUM_RECIPES=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes | length")
  echo -e "${GREEN}✅ Has recipes array ($NUM_RECIPES recipes)${NC}"
else
  echo -e "${RED}❌ Missing recipes array${NC}"
fi

if [ "$HAS_TOTAL_NUTRITION" = "true" ]; then
  echo -e "${GREEN}✅ Has totalNutrition${NC}"
else
  echo -e "${RED}❌ Missing totalNutrition${NC}"
fi

if [ "$HAS_MEAL_TIME" = "true" ]; then
  MEAL_TIME=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.mealTime")
  echo -e "${GREEN}✅ Has mealTime: $MEAL_TIME${NC}"
else
  echo -e "${RED}❌ Missing mealTime${NC}"
fi

if [ "$HAS_TARGET_CALORIES" = "true" ]; then
  TARGET_CAL=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.targetCalories")
  echo -e "${GREEN}✅ Has targetCalories: $TARGET_CAL${NC}"
else
  echo -e "${RED}❌ Missing targetCalories${NC}"
fi

# Check first recipe structure
echo -e "\n${BLUE}=== First Recipe Structure ===${NC}"
FIRST_RECIPE_ID=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].id")
FIRST_RECIPE_TITLE=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].title")
HAS_INGREDIENTS=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].ingredients != null")
HAS_INSTRUCTIONS=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].instructions != null")
HAS_RECIPE_NUTRITION=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].nutrition != null")

echo -e "Recipe ID: ${FIRST_RECIPE_ID}"
echo -e "Recipe Title: ${FIRST_RECIPE_TITLE}"

if [ "$HAS_INGREDIENTS" = "true" ]; then
  NUM_INGREDIENTS=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].ingredients | length")
  echo -e "${GREEN}✅ Has ingredients array ($NUM_INGREDIENTS ingredients)${NC}"
else
  echo -e "${RED}❌ Missing ingredients array${NC}"
fi

if [ "$HAS_INSTRUCTIONS" = "true" ]; then
  NUM_INSTRUCTIONS=$(echo $AI_PLAN_RESPONSE | jq -r ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0].instructions | length")
  echo -e "${GREEN}✅ Has instructions array ($NUM_INSTRUCTIONS steps)${NC}"
else
  echo -e "${RED}❌ Missing instructions array${NC}"
fi

if [ "$HAS_RECIPE_NUTRITION" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition object${NC}"
else
  echo -e "${RED}❌ Missing nutrition object${NC}"
fi

# Display sample data
echo -e "\n${BLUE}=== Sample Data ===${NC}"
echo -e "\n${YELLOW}First Day:${NC}"
echo $AI_PLAN_RESPONSE | jq '.data.suggestions[0] | {day, date, meals: (.meals | keys)}'

echo -e "\n${YELLOW}First Recipe:${NC}"
echo $AI_PLAN_RESPONSE | jq ".data.suggestions[0].meals.${FIRST_MEAL_NAME}.recipes[0] | {id, title, nutrition, ingredientCount: (.ingredients | length), instructionCount: (.instructions | length)}"

echo -e "\n${YELLOW}Nutrition Summary:${NC}"
echo $AI_PLAN_RESPONSE | jq '.data.nutrition.overall.macros'

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\nFull response saved in: ${YELLOW}claude_meal_plan_response.json${NC}"
echo -e "View it with: ${YELLOW}cat claude_meal_plan_response.json | jq '.'${NC}\n"

