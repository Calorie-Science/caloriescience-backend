#!/bin/bash

# Direct test of Bon Happetee API to see actual response format

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$BON_HAPPETEE_API_KEY" ]; then
  echo "❌ BON_HAPPETEE_API_KEY not found in environment"
  exit 1
fi

echo "Testing Bon Happetee API directly..."
echo "======================================="

# Test recipe ID from user's example
RECIPE_ID="341f30a0-30ab-4501-b2d3-21f9a39cff60"

echo -e "\n1. Testing /ingredients endpoint:"
echo "GET https://api.bonhappetee.com/ingredients?food_item_id=$RECIPE_ID"
echo "---"

INGREDIENTS_RESPONSE=$(curl -s -L \
  -H "Accept: application/json" \
  -H "x-api-key: $BON_HAPPETEE_API_KEY" \
  "https://api.bonhappetee.com/ingredients?food_item_id=$RECIPE_ID")

echo "$INGREDIENTS_RESPONSE" | jq '.'

echo -e "\n2. Checking first ingredient structure:"
echo "$INGREDIENTS_RESPONSE" | jq '.ingredients[0]'

echo -e "\n3. Checking available fields in first ingredient:"
echo "$INGREDIENTS_RESPONSE" | jq '.ingredients[0] | keys'

echo -e "\n4. Checking basic_unit_measure field:"
echo "$INGREDIENTS_RESPONSE" | jq '.ingredients[0].basic_unit_measure'

echo -e "\n5. Full first 3 ingredients:"
echo "$INGREDIENTS_RESPONSE" | jq '.ingredients[0:3]'

echo -e "\n======================================="
echo "Test complete!"

