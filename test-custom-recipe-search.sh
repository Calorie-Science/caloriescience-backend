#!/bin/bash

# Test script for custom recipe search functionality
# Verifies that custom recipes appear in client-aware recipe search

# IMPORTANT: Replace these with your actual values
BASE_URL="https://caloriescience-api.vercel.app"
AUTH_TOKEN="YOUR_TOKEN_HERE"
CLIENT_ID="YOUR_CLIENT_ID"

echo "=================================================="
echo "CUSTOM RECIPE SEARCH TEST"
echo "=================================================="
echo ""

# Step 1: Create a test custom recipe
echo "Step 1: Creating a test custom recipe..."
echo "--------------------------------------------------"
CREATE_RECIPE=$(curl -s -X POST "${BASE_URL}/api/recipes/custom" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -H "content-type: application/json" \
  --data-raw '{
    "recipeName": "Test High-Protein Smoothie Bowl",
    "description": "A test custom recipe for search verification",
    "servings": 2,
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "isPublic": true,
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "dishTypes": ["main course"],
    "healthLabels": ["high-protein", "gluten-free"],
    "dietLabels": ["vegetarian"],
    "allergens": ["tree-nuts"],
    "ingredients": [
      {
        "ingredientName": "banana",
        "quantity": 1,
        "unit": "medium"
      },
      {
        "ingredientName": "almond milk",
        "quantity": 1,
        "unit": "cup"
      },
      {
        "ingredientName": "protein powder",
        "quantity": 30,
        "unit": "gram"
      }
    ],
    "instructions": [
      "Add all ingredients to a blender",
      "Blend until smooth",
      "Pour into bowl and serve"
    ],
    "imageUrl": "https://example.com/smoothie.jpg"
  }')

RECIPE_ID=$(echo "$CREATE_RECIPE" | jq -r '.data.id // empty')

if [ -z "$RECIPE_ID" ]; then
  echo "❌ Failed to create recipe:"
  echo "$CREATE_RECIPE" | jq '.'
  exit 1
fi

echo "✅ Created custom recipe: $RECIPE_ID"
echo ""

# Step 2: Search using general recipe search (already working)
echo "Step 2: Testing general recipe search (GET /api/recipe-search)..."
echo "--------------------------------------------------"
GENERAL_SEARCH=$(curl -s "${BASE_URL}/api/recipe-search?query=smoothie&maxResults=10&includeCustom=true" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

GENERAL_CUSTOM_COUNT=$(echo "$GENERAL_SEARCH" | jq '[.data.recipes[] | select(.source == "manual")] | length')
echo "Custom recipes in general search: $GENERAL_CUSTOM_COUNT"

echo "$GENERAL_SEARCH" | jq '[.data.recipes[] | select(.source == "manual")] | map({
  id,
  title,
  source,
  isCustom,
  calories
})'
echo ""

# Step 3: Search using client-aware search (SHOULD NOW WORK)
echo "Step 3: Testing client-aware recipe search (GET /api/recipe-search-client)..."
echo "--------------------------------------------------"
CLIENT_SEARCH=$(curl -s "${BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=smoothie&maxResults=10" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

CLIENT_CUSTOM_COUNT=$(echo "$CLIENT_SEARCH" | jq '[.data.recipes[] | select(.source == "manual")] | length')
echo "Custom recipes in client search: $CLIENT_CUSTOM_COUNT"

if [ "$CLIENT_CUSTOM_COUNT" -gt 0 ]; then
  echo "✅ Custom recipes ARE appearing in client search!"
  echo ""
  echo "Custom recipes found:"
  echo "$CLIENT_SEARCH" | jq '[.data.recipes[] | select(.source == "manual")] | map({
    id,
    title,
    source,
    isCustom,
    calories
  })'
else
  echo "❌ Custom recipes NOT appearing in client search"
  echo ""
  echo "All recipes:"
  echo "$CLIENT_SEARCH" | jq '.data.recipes | map({
    id,
    title,
    source
  }) | .[0:5]'
fi
echo ""

# Step 4: Search for exact recipe name
echo "Step 4: Searching for exact custom recipe name..."
echo "--------------------------------------------------"
EXACT_SEARCH=$(curl -s "${BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=Test+High-Protein+Smoothie&maxResults=5" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

EXACT_FOUND=$(echo "$EXACT_SEARCH" | jq -r '[.data.recipes[] | select(.id == "'$RECIPE_ID'")] | length')

if [ "$EXACT_FOUND" -gt 0 ]; then
  echo "✅ Found custom recipe by exact name!"
else
  echo "❌ Custom recipe NOT found by exact name"
fi
echo ""

# Step 5: List all custom recipes
echo "Step 5: Listing all custom recipes (GET /api/recipes/custom)..."
echo "--------------------------------------------------"
ALL_CUSTOM=$(curl -s "${BASE_URL}/api/recipes/custom?search=smoothie" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

echo "$ALL_CUSTOM" | jq '{
  success: .success,
  total: .pagination.total,
  recipes: .data | map({
    id,
    title,
    isPublic,
    calories: .nutrition.caloriesPerServing
  }) | .[0:3]
}'
echo ""

# Step 6: Clean up - Delete the test recipe
echo "Step 6: Cleaning up - Deleting test recipe..."
echo "--------------------------------------------------"
DELETE_RECIPE=$(curl -s -X DELETE "${BASE_URL}/api/recipes/custom/${RECIPE_ID}" \
  -H "authorization: Bearer ${AUTH_TOKEN}")

echo "$DELETE_RECIPE" | jq '{
  success: .success,
  message: .message
}'
echo ""

echo "=================================================="
echo "TEST COMPLETE"
echo "=================================================="
echo ""
echo "Summary:"
echo "- General search custom count: $GENERAL_CUSTOM_COUNT"
echo "- Client search custom count: $CLIENT_CUSTOM_COUNT"
echo "- Exact name search found: $EXACT_FOUND"
echo ""

if [ "$CLIENT_CUSTOM_COUNT" -gt 0 ]; then
  echo "✅ PASS: Custom recipes are appearing in client-aware search!"
else
  echo "❌ FAIL: Custom recipes are NOT appearing in client-aware search"
fi

