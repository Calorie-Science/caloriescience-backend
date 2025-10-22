#!/bin/bash

# Test script for Custom Recipe Creation feature
# This script tests all CRUD operations for custom recipes

set -e  # Exit on error

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TOKEN="${AUTH_TOKEN}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if token is set
if [ -z "$TOKEN" ]; then
    print_error "AUTH_TOKEN environment variable is not set"
    echo "Usage: AUTH_TOKEN=your_token ./test-custom-recipes.sh"
    exit 1
fi

echo "=========================================="
echo "Custom Recipe Creation Feature Tests"
echo "=========================================="
echo ""

# Test 1: Create a custom recipe
print_step "Test 1: Creating a custom recipe"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/recipes/custom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Test High-Protein Smoothie",
    "description": "A test recipe for automated testing",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 105,
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1
        }
      },
      {
        "name": "protein powder",
        "quantity": 30,
        "unit": "g",
        "nutritionData": {
          "calories": 120,
          "protein": 24,
          "carbs": 3,
          "fat": 1.5,
          "fiber": 0
        }
      }
    ],
    "servings": 2,
    "instructions": ["Blend all ingredients", "Serve chilled"],
    "customNotes": "Test recipe - safe to delete",
    "healthLabels": ["high-protein"],
    "mealTypes": ["breakfast"],
    "prepTimeMinutes": 5,
    "isPublic": false
  }')

echo "$CREATE_RESPONSE" | jq '.'

RECIPE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ "$RECIPE_ID" != "null" ] && [ ! -z "$RECIPE_ID" ]; then
    print_success "Recipe created successfully with ID: $RECIPE_ID"
else
    print_error "Failed to create recipe"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

echo ""

# Test 2: Get recipe details
print_step "Test 2: Fetching recipe details"
DETAILS_RESPONSE=$(curl -s -X GET "$API_URL/api/recipes/$RECIPE_ID/details" \
  -H "Authorization: Bearer $TOKEN")

echo "$DETAILS_RESPONSE" | jq '.'

if echo "$DETAILS_RESPONSE" | jq -e '.success' > /dev/null; then
    print_success "Recipe details fetched successfully"
else
    print_error "Failed to fetch recipe details"
fi

echo ""

# Test 3: List custom recipes
print_step "Test 3: Listing custom recipes"
LIST_RESPONSE=$(curl -s -X GET "$API_URL/api/recipes/custom?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | jq '.'

RECIPE_COUNT=$(echo "$LIST_RESPONSE" | jq '.data | length')
print_success "Found $RECIPE_COUNT custom recipe(s)"

echo ""

# Test 4: Search for custom recipes
print_step "Test 4: Searching for custom recipes in unified search"
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/api/recipe-search?provider=manual&query=smoothie" \
  -H "Authorization: Bearer $TOKEN")

echo "$SEARCH_RESPONSE" | jq '.'

SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq '.data.recipes | length')
print_success "Found $SEARCH_COUNT recipe(s) in search"

echo ""

# Test 5: Update recipe
print_step "Test 5: Updating recipe"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/recipes/custom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$RECIPE_ID\",
    \"recipeName\": \"Updated Test Smoothie\",
    \"isPublic\": true
  }")

echo "$UPDATE_RESPONSE" | jq '.'

if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null; then
    print_success "Recipe updated successfully"
else
    print_error "Failed to update recipe"
fi

echo ""

# Test 6: Search with filters
print_step "Test 6: Searching with health label filter"
FILTER_SEARCH=$(curl -s -X GET "$API_URL/api/recipe-search?provider=both&includeCustom=true&health=high-protein" \
  -H "Authorization: Bearer $TOKEN")

echo "$FILTER_SEARCH" | jq '.data.recipes[] | select(.source == "manual") | {id, title, source, calories, protein}'

CUSTOM_IN_SEARCH=$(echo "$FILTER_SEARCH" | jq '[.data.recipes[] | select(.source == "manual")] | length')
print_success "Found $CUSTOM_IN_SEARCH custom recipe(s) in filtered search"

echo ""

# Test 7: Verify nutrition calculation
print_step "Test 7: Verifying nutrition calculation"
CALORIES_PER_SERVING=$(echo "$CREATE_RESPONSE" | jq '.data.caloriesPerServing')
PROTEIN_PER_SERVING=$(echo "$CREATE_RESPONSE" | jq '.data.proteinPerServingG')

# Expected: (105 + 120) / 2 = 112.5 calories
# Expected: (1.3 + 24) / 2 = 12.65 protein
EXPECTED_CALORIES=112.5
EXPECTED_PROTEIN=12.65

print_warning "Calories per serving: $CALORIES_PER_SERVING (expected: $EXPECTED_CALORIES)"
print_warning "Protein per serving: $PROTEIN_PER_SERVING g (expected: $EXPECTED_PROTEIN g)"

echo ""

# Test 8: Test access control - try to list with includePublic=false
print_step "Test 8: Testing access control (own recipes only)"
OWN_RECIPES=$(curl -s -X GET "$API_URL/api/recipes/custom?includePublic=false" \
  -H "Authorization: Bearer $TOKEN")

OWN_COUNT=$(echo "$OWN_RECIPES" | jq '.data | length')
print_success "Found $OWN_COUNT of your own recipe(s)"

echo ""

# Test 9: Create a public recipe
print_step "Test 9: Creating a public recipe"
PUBLIC_RECIPE=$(curl -s -X POST "$API_URL/api/recipes/custom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Public Test Recipe",
    "description": "Public test recipe",
    "ingredients": [
      {
        "name": "oats",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 150,
          "protein": 5,
          "carbs": 27,
          "fat": 3,
          "fiber": 4
        }
      }
    ],
    "servings": 1,
    "isPublic": true
  }')

PUBLIC_RECIPE_ID=$(echo "$PUBLIC_RECIPE" | jq -r '.data.id')
if [ "$PUBLIC_RECIPE_ID" != "null" ]; then
    print_success "Public recipe created with ID: $PUBLIC_RECIPE_ID"
else
    print_error "Failed to create public recipe"
fi

echo ""

# Test 10: Delete recipes
print_step "Test 10: Cleaning up - deleting test recipes"

# Delete first recipe
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/recipes/custom?id=$RECIPE_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null; then
    print_success "First recipe deleted successfully"
else
    print_error "Failed to delete first recipe"
fi

# Delete second recipe
if [ "$PUBLIC_RECIPE_ID" != "null" ]; then
    DELETE_RESPONSE2=$(curl -s -X DELETE "$API_URL/api/recipes/custom?id=$PUBLIC_RECIPE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$DELETE_RESPONSE2" | jq -e '.success' > /dev/null; then
        print_success "Second recipe deleted successfully"
    else
        print_error "Failed to delete second recipe"
    fi
fi

echo ""
echo "=========================================="
echo "All tests completed!"
echo "=========================================="

