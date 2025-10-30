#!/bin/bash

# Test script to verify that ingredient search API returns proper id and name fields
# Bug: id and name were coming back the same (both were the ingredient name)
# Fix: id now returns the database UUID

BASE_URL="http://localhost:3000"

echo "🧪 Testing Ingredient Search API - ID vs Name Fix"
echo "=================================================="
echo ""

# Get auth token
echo "📝 Step 1: Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got auth token"
echo ""

# Test 1: Search for broccoli
echo "🔍 Test 1: Search for 'broccoli'"
echo "-----------------------------------"
BROCCOLI_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ingredients/search?query=broccoli&limit=3" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $BROCCOLI_RESPONSE | jq '.'
echo ""

# Extract first ingredient
FIRST_INGREDIENT=$(echo $BROCCOLI_RESPONSE | jq '.data.ingredients[0]')
INGREDIENT_ID=$(echo $FIRST_INGREDIENT | jq -r '.id')
INGREDIENT_NAME=$(echo $FIRST_INGREDIENT | jq -r '.name')

echo "First Ingredient:"
echo "  ID:   $INGREDIENT_ID"
echo "  Name: $INGREDIENT_NAME"
echo ""

# Check if id and name are different
if [ "$INGREDIENT_ID" = "$INGREDIENT_NAME" ]; then
  echo "❌ FAILED: ID and Name are the same!"
  echo "   ID should be a UUID, not the ingredient name"
else
  echo "✅ PASSED: ID and Name are different"
  
  # Check if ID looks like a UUID (contains hyphens)
  if [[ $INGREDIENT_ID == *"-"* ]]; then
    echo "✅ PASSED: ID appears to be a UUID"
  else
    echo "⚠️  WARNING: ID doesn't look like a UUID (expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
  fi
fi
echo ""

# Test 2: Search for chicken
echo "🔍 Test 2: Search for 'chicken'"
echo "-----------------------------------"
CHICKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ingredients/search?query=chicken&limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $CHICKEN_RESPONSE | jq '.data.ingredients[] | {id: .id, name: .name, title: .title}'
echo ""

# Count how many results have id = name
CHICKEN_INGREDIENTS=$(echo $CHICKEN_RESPONSE | jq -r '.data.ingredients[]')
TOTAL_COUNT=$(echo $CHICKEN_RESPONSE | jq '.data.ingredients | length')
SAME_COUNT=0

for i in $(seq 0 $((TOTAL_COUNT - 1))); do
  ID=$(echo $CHICKEN_RESPONSE | jq -r ".data.ingredients[$i].id")
  NAME=$(echo $CHICKEN_RESPONSE | jq -r ".data.ingredients[$i].name")
  
  if [ "$ID" = "$NAME" ]; then
    SAME_COUNT=$((SAME_COUNT + 1))
  fi
done

echo "Summary:"
echo "  Total ingredients: $TOTAL_COUNT"
echo "  Ingredients with ID = Name: $SAME_COUNT"
echo ""

if [ $SAME_COUNT -eq 0 ]; then
  echo "✅ ALL TESTS PASSED: All ingredients have proper IDs"
else
  echo "❌ TESTS FAILED: $SAME_COUNT ingredients have ID = Name"
fi
echo ""

# Test 3: Verify response structure
echo "🔍 Test 3: Verify response structure"
echo "-------------------------------------"
echo "Checking first ingredient fields..."
echo $FIRST_INGREDIENT | jq '{
  id: .id,
  name: .name,
  title: .title,
  category: .category,
  calories: .calories,
  protein: .protein
}'
echo ""

echo "✅ Test complete!"

