#!/bin/bash

# Test script for portion size feature
# This script demonstrates how to fetch portion sizes and add recipes with portion size selection

set -e

# Configuration
API_BASE_URL="https://caloriescience-api.vercel.app/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjE4MjYxODYsImV4cCI6MTc2MjQzMDk4Nn0.EYNTM0YVc56QYbBPKPTtyw3khccE5-kaijKl8GOPUaw"
RECIPE_ID="dfd2bf8d-8a37-48c8-aae8-9fceec4988fa"

echo "=========================================="
echo "Portion Size Feature Test"
echo "=========================================="
echo ""

# Test 1: Get available portion sizes for recipe
echo "Test 1: Fetching available portion sizes for custom recipe..."
echo "Recipe ID: $RECIPE_ID"
echo ""

PORTION_RESPONSE=$(curl -s "https://caloriescience-api.vercel.app/api/recipes/portion-sizes?recipeId=$RECIPE_ID&provider=manual" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$PORTION_RESPONSE" | python3 -m json.tool

# Extract portion size IDs for testing
PORTION_SIZE_IDS=$(echo "$PORTION_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(','.join([p['id'] for p in data.get('data', {}).get('portionSizes', [])]))" 2>/dev/null || echo "")

if [ -z "$PORTION_SIZE_IDS" ]; then
    echo ""
    echo "⚠️  No portion sizes found in response. Make sure:"
    echo "   1. The recipe exists and is a custom recipe (provider='manual')"
    echo "   2. There are portion sizes in the database"
    echo "   3. The token is valid"
    exit 1
fi

echo ""
echo "✅ Found portion sizes: $PORTION_SIZE_IDS"
echo ""

# Get the first portion size ID for testing
FIRST_PORTION_ID=$(echo "$PORTION_SIZE_IDS" | cut -d',' -f1)

echo "=========================================="
echo "Next Steps (Manual):"
echo "=========================================="
echo ""
echo "1. Create a manual meal plan draft (if you don't have one):"
echo ""
echo "   curl -X POST '$API_BASE_URL/meal-plans/manual/create' \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"clientId\": \"YOUR_CLIENT_ID\","
echo "       \"planDate\": \"2025-12-01\","
echo "       \"durationDays\": 7"
echo "     }'"
echo ""
echo "2. Add recipe with portion size selection:"
echo ""
echo "   curl -X POST '$API_BASE_URL/meal-plans/manual/add-recipe' \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"draftId\": \"YOUR_DRAFT_ID\","
echo "       \"day\": 1,"
echo "       \"mealName\": \"Lunch\","
echo "       \"recipe\": {"
echo "         \"id\": \"$RECIPE_ID\","
echo "         \"provider\": \"manual\","
echo "         \"source\": \"cached\""
echo "       },"
echo "       \"portionSizeId\": \"$FIRST_PORTION_ID\","
echo "       \"nutritionServings\": 1"
echo "     }'"
echo ""
echo "=========================================="
echo "Feature Documentation"
echo "=========================================="
echo ""
echo "See docs/PORTION_SIZE_FEATURE.md for complete documentation"
echo ""
