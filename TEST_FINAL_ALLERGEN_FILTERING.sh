#!/bin/bash

# Final Comprehensive Allergen Filtering Test
# Tests all three providers with ingredient-level filtering

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MTExMzE1MCwiZXhwIjoxNzYxNzE3OTUwfQ.WeO8ICey7SHMh0mD0KE8MkkWev76FdkgF0RSpn3hYd8"
API_URL="https://caloriescience-api.vercel.app"

echo "=========================================="
echo "  FINAL ALLERGEN FILTERING TEST"
echo "  All 3 Providers with Ingredients"
echo "=========================================="
echo ""

# TEST 1: EDAMAM - Dairy filtering
echo "=== TEST 1: EDAMAM - Dairy Filter ==="
echo "Query: 'paneer curry' with dairy-free filter"
echo ""
curl -s "${API_URL}/api/recipe-search?query=paneer%20curry&health=dairy-free&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    original: .metadata.originalCount,
    filtered: .metadata.filteredCount,
    removed: (.metadata.originalCount - .metadata.filteredCount)
  },
  recipes: [.data.recipes[] | {
    title,
    dairyIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("paneer|cheese|milk|cream|yogurt|butter|ghee|curd|khoa|mawa|dahi")) | .name],
    totalIngredients: (.ingredients | length)
  }]
}'
echo ""
echo "✅ Expected: 0 dairy ingredients in all recipes"
echo "----------------------------------------"
echo ""

# TEST 2: SPOONACULAR - Gluten filtering
echo "=== TEST 2: SPOONACULAR - Gluten Filter ==="
echo "Query: 'pasta' with gluten-free filter"
echo ""
curl -s "${API_URL}/api/recipe-search?query=pasta&health=gluten-free&provider=spoonacular&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    original: .metadata.originalCount,
    filtered: .metadata.filteredCount,
    removed: (.metadata.originalCount - .metadata.filteredCount)
  },
  recipes: [.data.recipes[] | {
    title,
    healthLabels,
    glutenIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("wheat|flour|bread|pasta|noodle|barley|rye|malt|seitan")) | .name],
    totalIngredients: (.ingredients | length)
  }]
}'
echo ""
echo "✅ Expected: All recipes have ingredients, 0 gluten ingredients"
echo "----------------------------------------"
echo ""

# TEST 3: BON APPETIT - Dairy filtering  
echo "=== TEST 3: BON APPETIT - Dairy Filter ==="
echo "Query: 'paneer' with dairy-free filter"
echo ""
curl -s "${API_URL}/api/recipe-search?query=paneer&health=dairy-free&provider=bonhappetee&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    original: .metadata.originalCount,
    filtered: .metadata.filteredCount
  },
  recipes: [.data.recipes[] | {
    title,
    allergens,
    dairyIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("paneer|cheese|milk|cream|yogurt|butter|ghee|curd|dahi")) | .name],
    totalIngredients: (.ingredients | length)
  }]
}'
echo ""
echo "✅ Expected: No 'dairy' in allergens, 0 dairy ingredients"
echo "----------------------------------------"
echo ""

# TEST 4: ALL PROVIDERS - Multi-allergen filtering
echo "=== TEST 4: ALL PROVIDERS - Dairy + Tree Nut Filter ==="
echo "Query: 'curry' with dairy-free AND tree-nut-free"
echo ""
curl -s "${API_URL}/api/recipe-search?query=curry&health=dairy-free&health=tree-nut-free&provider=all&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  providers: {
    edamam: [.data.recipes[] | select(.source == "edamam")] | length,
    spoonacular: [.data.recipes[] | select(.source == "spoonacular")] | length,
    bonhappetee: [.data.recipes[] | select(.source == "bonhappetee")] | length,
    manual: [.data.recipes[] | select(.source == "manual")] | length
  },
  filtering: .metadata,
  sampleRecipes: [.data.recipes[0:3][] | {
    title,
    source,
    allergenIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("paneer|cheese|milk|cream|almond|cashew|walnut|kaju|nut")) | .name],
    totalIngredients: (.ingredients | length)
  }]
}'
echo ""
echo "✅ Expected: No dairy OR tree nut ingredients from any provider"
echo "----------------------------------------"
echo ""

# TEST 5: Draft Usage Metadata
echo "=== TEST 5: Draft Usage Metadata ==="
echo "Checking recipe usage in drafts..."
echo ""
curl -s "${API_URL}/api/recipe-search?query=chicken&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithUsage: [.data.recipes[] | select(.usageMetadata.usedInDrafts | length > 0)] | length,
  sample: [.data.recipes[0:2][] | {
    title,
    usageMetadata
  }]
}'
echo ""
echo "✅ Expected: usageMetadata present on all recipes"
echo "----------------------------------------"
echo ""

# TEST 6: Specific Indian Ingredients
echo "=== TEST 6: Indian Dairy Ingredients (ghee, khoa, mawa) ==="
echo "Testing if Indian dairy products are caught..."
echo ""
curl -s "${API_URL}/api/recipe-search?query=dal&health=dairy-free&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithIndianDairy: [.data.recipes[] | select(.ingredients[]? | .name | ascii_downcase | test("ghee|khoa|mawa|dahi|curd|paneer")) | .title]
}'
echo ""
echo "✅ Expected: 0 recipes with ghee/khoa/mawa/dahi/curd/paneer"
echo "----------------------------------------"
echo ""

# Summary
echo ""
echo "=========================================="
echo "           TEST SUMMARY"
echo "=========================================="
echo ""
echo "If all tests pass, you should see:"
echo ""
echo "✅ Edamam: Recipes filtered by ingredient keywords"
echo "✅ Spoonacular: Ingredients fetched from cache/API"
echo "✅ Bon Appetit: Ingredients + allergens from API"
echo "✅ No allergen ingredients in any filtered results"
echo "✅ usageMetadata shows draft usage"
echo "✅ Indian dairy caught (ghee, paneer, khoa, etc.)"
echo ""
echo "=========================================="

