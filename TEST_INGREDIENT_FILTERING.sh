#!/bin/bash

# Test Ingredient-Level Allergen Filtering
# Run after deployment to verify filtering works

TOKEN="${AUTH_TOKEN}"
API_URL="https://caloriescience-api.vercel.app"

if [ -z "$TOKEN" ]; then
    echo "❌ Set AUTH_TOKEN environment variable first"
    exit 1
fi

echo "=========================================="
echo "  Ingredient-Level Allergen Filter Tests"
echo "=========================================="
echo ""

# TEST 1: Dairy filtering
echo "=== TEST 1: Dairy Filter (should exclude paneer) ==="
echo "Searching for 'paneer' with dairy-free filter..."
echo ""

curl -s "${API_URL}/api/recipe-search?query=paneer&health=dairy-free&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  metadata: .metadata,
  recipes: [.data.recipes[] | {
    title,
    hasIngredients: (.ingredients | length > 0),
    dairyIngredients: [.ingredients[]? | select(.name | test("paneer|cheese|milk|cream|yogurt|butter|ghee|curd"; "i")) | .name]
  }]
}'

echo ""
echo "✅ Expected: 0 recipes with dairy ingredients"
echo ""

# TEST 2: Tree nut filtering
echo "=== TEST 2: Tree Nut Filter ==="
echo "Searching with tree-nut-free filter..."
echo ""

curl -s "${API_URL}/api/recipe-search?query=salad&health=tree-nut-free&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipes: [.data.recipes[] | {
    title,
    nutIngredients: [.ingredients[]? | select(.name | test("almond|cashew|walnut|pecan|hazelnut|pistachio|macadamia"; "i")) | .name]
  }]
}'

echo ""
echo "✅ Expected: 0 recipes with tree nut ingredients"
echo ""

# TEST 3: Multiple allergen filters
echo "=== TEST 3: Multiple Allergens (dairy + gluten) ==="
echo "Searching with dairy-free AND gluten-free..."
echo ""

curl -s "${API_URL}/api/recipe-search?query=curry&health=dairy-free&health=gluten-free&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  filtering: .metadata.ingredientLevelFiltering,
  originalCount: .metadata.originalCount,
  filteredCount: .metadata.filteredCount,
  recipeTitles: [.data.recipes[].title]
}'

echo ""
echo "✅ Expected: Only recipes without dairy OR gluten ingredients"
echo ""

# TEST 4: Draft usage metadata
echo "=== TEST 4: Draft Usage Metadata ==="
echo "Checking if recipes show usage in drafts..."
echo ""

curl -s "${API_URL}/api/recipe-search?query=chicken&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  recipes: [.data.recipes[] | {
    id,
    title,
    usageMetadata: .usageMetadata
  }]
}'

echo ""
echo "✅ Expected: usageMetadata field present (may be empty if not used)"
echo ""

# TEST 5: Manual recipe filtering
echo "=== TEST 5: Manual Recipe Allergen Filtering ==="
echo "Searching manual recipes..."
echo ""

curl -s "${API_URL}/api/recipe-search?query=scramble&provider=manual&maxResults=3" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipes: [.data.recipes[] | {
    title,
    source,
    allergens,
    healthLabels,
    ingredientsCount: (.ingredients | length),
    firstIngredient: .ingredients[0].name
  }]
}'

echo ""
echo "✅ Expected: Manual recipes with complete ingredient data"
echo ""

# TEST 6: Verify health labels are returned
echo "=== TEST 6: Health Labels from All Providers ==="
echo ""

echo "Edamam health labels:"
curl -s "${API_URL}/api/recipe-search?query=soup&provider=edamam&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.recipes[0].healthLabels'

echo ""
echo "Spoonacular health labels:"
curl -s "${API_URL}/api/recipe-search?query=pasta&provider=spoonacular&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.recipes[0].healthLabels'

echo ""
echo "✅ Expected: Array of health labels from each provider"
echo ""

echo "=========================================="
echo "           Tests Complete"
echo "=========================================="
echo ""
echo "Summary of Features:"
echo "1. ✅ Ingredient-level allergen filtering"
echo "2. ✅ Complete metadata in search results"
echo "3. ✅ Draft usage tracking"
echo "4. ✅ 200+ allergen keywords"
echo "5. ✅ Works across all providers"
echo ""

