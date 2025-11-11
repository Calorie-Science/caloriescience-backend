#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg3NWNkNWIxLTMxNGItNDU3YS1hMzA2LWY2OWZmMzcwODliNCIsImVtYWlsIjoibXJpbmFsQHRlc3QuY29tIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MjMyMTk5MiwiZXhwIjoxNzYyOTI2NzkyfQ.DZTueg_WqOc_kgw9_gd09DBuuJxL2PCBPBLRJciRc8w"
API_URL="https://caloriescience-api.vercel.app"

echo "========================================="
echo "Testing Portion Sizes Endpoints"
echo "========================================="
echo ""

# Test 1: Get portion sizes by category CODE
echo "Test 1: GET /api/food-categories/soup_thin/portion-sizes (by CODE)"
echo "-------------------------------------------------------------------"
RESPONSE_CODE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/food-categories/soup_thin/portion-sizes" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE_CODE" | tail -n1)
BODY=$(echo "$RESPONSE_CODE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo ""
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS - Response:"
  echo "$BODY" | python3 -m json.tool | head -40
else
  echo "❌ FAILED - Response:"
  echo "$BODY" | python3 -m json.tool
fi
echo ""
echo ""

# Test 2: Get portion sizes by category ID
CATEGORY_ID="797494de-7f93-4e2c-af6d-9e6f9c77c122"  # soup_thin ID
echo "Test 2: GET /api/food-categories/${CATEGORY_ID}/portion-sizes (by ID)"
echo "-------------------------------------------------------------------"
RESPONSE_CODE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/food-categories/${CATEGORY_ID}/portion-sizes" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE_CODE" | tail -n1)
BODY=$(echo "$RESPONSE_CODE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo ""
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS - Response:"
  echo "$BODY" | python3 -m json.tool | head -40
else
  echo "❌ FAILED - Response:"
  echo "$BODY" | python3 -m json.tool
fi
echo ""
echo ""

# Test 3: Verify both return the same category
echo "Test 3: Verify both endpoints return the same category ID"
echo "-------------------------------------------------------------------"

CATEGORY_ID_FROM_CODE=$(curl -s "${API_URL}/api/food-categories/soup_thin/portion-sizes" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('category', {}).get('id', 'N/A'))" 2>/dev/null)

CATEGORY_ID_FROM_ID=$(curl -s "${API_URL}/api/food-categories/${CATEGORY_ID}/portion-sizes" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('category', {}).get('id', 'N/A'))" 2>/dev/null)

echo "Category ID from CODE endpoint: $CATEGORY_ID_FROM_CODE"
echo "Category ID from ID endpoint:   $CATEGORY_ID_FROM_ID"
echo ""

if [ "$CATEGORY_ID_FROM_CODE" = "$CATEGORY_ID_FROM_ID" ] && [ "$CATEGORY_ID_FROM_CODE" != "N/A" ]; then
  echo "✅ SUCCESS: Both endpoints return the same category ID!"
else
  echo "❌ FAILED: Endpoints return different category IDs or N/A"
fi

echo ""
echo "========================================="
echo "Tests Complete"
echo "========================================="
