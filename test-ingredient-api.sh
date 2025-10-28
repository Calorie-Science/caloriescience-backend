#!/bin/bash

# Quick test for Simple Ingredients Search API
# Make sure your dev server is running first!

echo "🔍 Testing Simple Ingredients Search API..."
echo ""

# You'll need to replace this with your actual JWT token
# Get it from: Login -> Copy token from browser developer tools
TOKEN=${AUTH_TOKEN:-""}

# Check if running locally or in production
BASE_URL=${API_URL:-"http://localhost:3000"}

echo "🌐 Using: $BASE_URL"
echo ""

if [ -z "$TOKEN" ]; then
    echo "⚠️  No AUTH_TOKEN found. Please set it:"
    echo "   export AUTH_TOKEN='your-jwt-token'"
    echo ""
    echo "📝 For now, showing the curl commands you can run manually:"
    echo ""
    
    echo "1️⃣  Search for broccoli (shows all 6 variants):"
    echo "curl -H 'Authorization: Bearer YOUR_TOKEN' '$BASE_URL/api/ingredients/search?query=broccoli' | jq"
    echo ""
    
    echo "2️⃣  Search for chicken in protein category:"
    echo "curl -H 'Authorization: Bearer YOUR_TOKEN' '$BASE_URL/api/ingredients/search?query=chicken&category=protein' | jq"
    echo ""
    
    echo "3️⃣  Search mushrooms with limit:"
    echo "curl -H 'Authorization: Bearer YOUR_TOKEN' '$BASE_URL/api/ingredients/search?query=mushroom&limit=5' | jq"
    echo ""
    
    echo "4️⃣  Get grouped results:"
    echo "curl -H 'Authorization: Bearer YOUR_TOKEN' '$BASE_URL/api/ingredients/search?query=broccoli' | jq '.data.grouped | keys'"
    echo ""
    
    exit 0
fi

echo "✅ Token found, running tests..."
echo ""

# Test 1: Search for broccoli
echo "1️⃣  Searching for 'broccoli'..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=broccoli" | jq '{
    totalResults: .data.totalResults,
    searchTime: .data.searchTime,
    ingredients: [.data.ingredients[] | {name, calories: .nutrition.calories}]
  }'
echo ""

# Test 2: Search proteins
echo "2️⃣  Searching for 'chicken' in proteins..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=chicken&category=protein&limit=10" | jq '{
    totalResults: .data.totalResults,
    searchTime: .data.searchTime,
    ingredients: [.data.ingredients[] | .name]
  }'
echo ""

# Test 3: Grouped results
echo "3️⃣  Getting grouped broccoli results..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=broccoli" | jq '{
    cookingMethods: (.data.grouped | keys),
    raw: (.data.grouped.raw | length),
    steamed: (.data.grouped.steamed | length),
    sauteed: (.data.grouped.sauteed | length),
    grilled: (.data.grouped.grilled | length),
    baked: (.data.grouped.baked | length)
  }'
echo ""

# Test 4: Performance check
echo "4️⃣  Performance check (50 results)..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/ingredients/search?query=a&limit=50" | jq '{
    totalResults: .data.totalResults,
    searchTime: .data.searchTime
  }'
echo ""

echo "✅ Tests completed!"

