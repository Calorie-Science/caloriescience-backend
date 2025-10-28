#!/bin/bash

# Test AI Meal Plan with Standardized Format
# This tests the updated AI meal plan generation that returns the same format as automated/manual meal plans

BASE_URL="http://localhost:3000"
# BASE_URL="https://your-deployment-url.vercel.app"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}AI Meal Plan Standardization Test${NC}"
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

# Test 1: Generate AI Meal Plan with default parameters
echo -e "${BLUE}Test 1: Generate AI Meal Plan (7 days, default start date)${NC}"
AI_PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"meal-plan\",
    \"action\": \"async-generate\",
    \"clientId\": \"$CLIENT_ID\",
    \"additionalText\": \"Focus on high-protein vegetarian meals with Indian cuisine\"
  }")

echo $AI_PLAN_RESPONSE | jq '.'

# Check if response has standardized format
HAS_SUGGESTIONS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.suggestions != null')
HAS_NUTRITION=$(echo $AI_PLAN_RESPONSE | jq -r '.data.nutrition != null')
HAS_SEARCH_PARAMS=$(echo $AI_PLAN_RESPONSE | jq -r '.data.searchParams != null')
HAS_COMPLETION=$(echo $AI_PLAN_RESPONSE | jq -r '.data.completionPercentage != null')
CREATION_METHOD=$(echo $AI_PLAN_RESPONSE | jq -r '.data.creationMethod')

echo -e "\n${BLUE}Validation Checks:${NC}"
if [ "$HAS_SUGGESTIONS" = "true" ]; then
  echo -e "${GREEN}✅ Has suggestions array${NC}"
else
  echo -e "${RED}❌ Missing suggestions array${NC}"
fi

if [ "$HAS_NUTRITION" = "true" ]; then
  echo -e "${GREEN}✅ Has nutrition breakdown${NC}"
else
  echo -e "${RED}❌ Missing nutrition breakdown${NC}"
fi

if [ "$HAS_SEARCH_PARAMS" = "true" ]; then
  echo -e "${GREEN}✅ Has searchParams${NC}"
else
  echo -e "${RED}❌ Missing searchParams${NC}"
fi

if [ "$HAS_COMPLETION" = "true" ]; then
  echo -e "${GREEN}✅ Has completionPercentage${NC}"
else
  echo -e "${RED}❌ Missing completionPercentage${NC}"
fi

if [ "$CREATION_METHOD" = "ai_generated" ]; then
  echo -e "${GREEN}✅ Creation method is ai_generated${NC}"
else
  echo -e "${RED}❌ Creation method is not ai_generated (got: $CREATION_METHOD)${NC}"
fi

# Test 2: Generate AI Meal Plan with custom parameters
echo -e "\n${BLUE}Test 2: Generate AI Meal Plan (14 days, custom start date)${NC}"
CUSTOM_START_DATE=$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d "+7 days" +%Y-%m-%d)
AI_PLAN_CUSTOM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"meal-plan\",
    \"action\": \"async-generate\",
    \"clientId\": \"$CLIENT_ID\",
    \"additionalText\": \"Keto-friendly meals with Mediterranean flavors\",
    \"days\": 14,
    \"startDate\": \"$CUSTOM_START_DATE\"
  }")

echo $AI_PLAN_CUSTOM_RESPONSE | jq '.'

PLAN_DAYS=$(echo $AI_PLAN_CUSTOM_RESPONSE | jq -r '.data.durationDays')
PLAN_START=$(echo $AI_PLAN_CUSTOM_RESPONSE | jq -r '.data.planDate')

echo -e "\n${BLUE}Custom Parameters Check:${NC}"
if [ "$PLAN_DAYS" = "14" ]; then
  echo -e "${GREEN}✅ Duration is 14 days${NC}"
else
  echo -e "${RED}❌ Duration is not 14 days (got: $PLAN_DAYS)${NC}"
fi

if [ "$PLAN_START" = "$CUSTOM_START_DATE" ]; then
  echo -e "${GREEN}✅ Start date is correct${NC}"
else
  echo -e "${RED}❌ Start date is incorrect (expected: $CUSTOM_START_DATE, got: $PLAN_START)${NC}"
fi

# Test 3: Verify format consistency with automated meal plan
echo -e "\n${BLUE}Test 3: Compare structure with automated meal plan${NC}"

# Generate automated meal plan for comparison
echo -e "${BLUE}Generating automated meal plan...${NC}"
AUTO_PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/meal-plans/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"days\": 7
  }")

# Extract keys from both responses
AI_KEYS=$(echo $AI_PLAN_RESPONSE | jq -r '.data | keys | .[]' | sort)
AUTO_KEYS=$(echo $AUTO_PLAN_RESPONSE | jq -r '.data | keys | .[]' | sort)

echo -e "\n${BLUE}AI Plan Keys:${NC}"
echo "$AI_KEYS"

echo -e "\n${BLUE}Automated Plan Keys:${NC}"
echo "$AUTO_KEYS"

# Check if key structures match
if [ "$AI_KEYS" = "$AUTO_KEYS" ]; then
  echo -e "\n${GREEN}✅ Structure matches automated meal plan${NC}"
else
  echo -e "\n${RED}❌ Structure differs from automated meal plan${NC}"
fi

echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}================================${NC}"

