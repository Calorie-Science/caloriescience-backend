#!/bin/bash

# Test script for Simple Ingredients Search API
# Usage: ./test-simple-ingredient-search.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Simple Ingredients Search API Test ===${NC}\n"

# Get token (replace with your actual token)
TOKEN="your-jwt-token-here"
BASE_URL="http://localhost:3000"

# Test 1: Basic search for broccoli
echo -e "${YELLOW}Test 1: Search for 'broccoli'${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=broccoli" | jq '.data.totalResults, .data.ingredients[] | .name'
echo -e "\n"

# Test 2: Search with category filter
echo -e "${YELLOW}Test 2: Search 'chicken' in protein category${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=chicken&category=protein" | jq '.data.totalResults, .data.ingredients[] | .name'
echo -e "\n"

# Test 3: Search with limit
echo -e "${YELLOW}Test 3: Search 'mushroom' with limit=5${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=mushroom&limit=5" | jq '.data.totalResults, .data.ingredients[] | .name'
echo -e "\n"

# Test 4: Search with allergen filter
echo -e "${YELLOW}Test 4: Search excluding dairy${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=milk&allergens=dairy" | jq '.data.totalResults, .data.ingredients[] | .name'
echo -e "\n"

# Test 5: Grouped results
echo -e "${YELLOW}Test 5: Grouped broccoli results${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=broccoli" | jq '.data.grouped | keys'
echo -e "\n"

# Test 6: Search time
echo -e "${YELLOW}Test 6: Performance check${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=vegetables&limit=50" | jq '.data.searchTime, .data.totalResults'
echo -e "\n"

# Test 7: All vegetables
echo -e "${YELLOW}Test 7: Get all vegetables (limited to 20)${NC}"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=&category=vegetable&limit=20" | jq '.data.totalResults'
echo -e "\n"

echo -e "${GREEN}✅ All tests completed!${NC}"

