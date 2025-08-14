#!/bin/bash

# Base URL
BASE_URL="https://caloriescience-5u40qfl0z-mrinals-projects-b39127c8.vercel.app"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing CalorieScience Auto-Calculation Feature${NC}"
echo "================================================"

# Step 1: Login to get auth token
echo -e "\n${GREEN}Step 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@caloriescience.com",
    "password": "test123"
  }')

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to login. Response:${NC}"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Login successful! Token obtained."

# Step 2: Create a client with complete information for auto-calculation
echo -e "\n${GREEN}Step 2: Creating a client with complete information...${NC}"
echo "This will automatically calculate EER, macros, and micronutrients"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "heightCm": 175,
    "weightKg": 75,
    "activityLevel": "moderately_active",
    "location": "London, UK",
    "healthGoals": ["weight_maintenance", "muscle_gain"],
    "dietaryPreferences": ["vegetarian"],
    "medicalConditions": [],
    "allergies": [],
    "status": "active"
  }')

# Extract client ID
CLIENT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CLIENT_ID" ]; then
  echo -e "${RED}Failed to create client. Response:${NC}"
  echo $CREATE_RESPONSE | jq '.' 2>/dev/null || echo $CREATE_RESPONSE
  exit 1
fi

echo "Client created successfully!"
echo -e "${BLUE}Client ID: $CLIENT_ID${NC}"

# Step 3: Retrieve the client to see all auto-calculated values
echo -e "\n${GREEN}Step 3: Retrieving client with auto-calculated values...${NC}"

sleep 2 # Give the server a moment to complete calculations

GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo -e "\n${BLUE}Client Details with Auto-Calculated Nutrition:${NC}"
echo $GET_RESPONSE | jq '.' 2>/dev/null || echo $GET_RESPONSE

# Step 4: Test update without auto-calculation
echo -e "\n${GREEN}Step 4: Testing update (should NOT trigger recalculation)...${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weightKg": 76,
    "notes": "Weight increased slightly"
  }')

echo -e "\n${BLUE}Update Response:${NC}"
echo $UPDATE_RESPONSE | jq '.' 2>/dev/null || echo $UPDATE_RESPONSE

# Step 5: Create another client without complete info (no auto-calculation)
echo -e "\n${GREEN}Step 5: Creating a client without complete info (no auto-calc)...${NC}"

CREATE_PARTIAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+9876543210",
    "status": "prospective"
  }')

PARTIAL_CLIENT_ID=$(echo $CREATE_PARTIAL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PARTIAL_CLIENT_ID" ]; then
  echo -e "${RED}Failed to create partial client. Response:${NC}"
  echo $CREATE_PARTIAL_RESPONSE | jq '.' 2>/dev/null || echo $CREATE_PARTIAL_RESPONSE
else
  echo "Partial client created successfully!"
  echo -e "${BLUE}Client ID: $PARTIAL_CLIENT_ID${NC}"
  
  # Get partial client
  GET_PARTIAL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/clients/$PARTIAL_CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  echo -e "\n${BLUE}Partial Client Details (no auto-calculated values):${NC}"
  echo $GET_PARTIAL_RESPONSE | jq '.client | {
    fullName,
    eerCalories,
    macrosRanges,
    micronutrients: (.micronutrients | {
      vitaminA,
      vitaminB12,
      vitaminC,
      iron,
      calcium
    })
  }' 2>/dev/null || echo "No nutrition data (as expected)"
fi

echo -e "\n${GREEN}Test completed!${NC}"
echo "================================================"
echo "Summary:"
echo "- Complete client: Auto-calculated EER, macros, and micronutrients"
echo "- Partial client: No auto-calculation (missing required fields)"
echo "- Updates: Do not trigger recalculation" 