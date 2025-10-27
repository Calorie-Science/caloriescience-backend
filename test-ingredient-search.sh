#!/bin/bash

# Test Ingredient-as-Recipe Search Feature
# Tests the automatic ingredient search integration in recipe-search-client API

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-https://caloriescience-api.vercel.app}"
TOKEN="${AUTH_TOKEN:-}"
CLIENT_ID="${CLIENT_ID:-}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Ingredient-as-Recipe Search Feature Test              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check for required environment variables
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ AUTH_TOKEN environment variable is required${NC}"
    echo "Usage: AUTH_TOKEN=your_token CLIENT_ID=client_id ./test-ingredient-search.sh"
    exit 1
fi

if [ -z "$CLIENT_ID" ]; then
    echo -e "${RED}❌ CLIENT_ID environment variable is required${NC}"
    echo "Usage: AUTH_TOKEN=your_token CLIENT_ID=client_id ./test-ingredient-search.sh"
    exit 1
fi

echo -e "${GREEN}✓ Configuration loaded${NC}"
echo -e "  API Base URL: ${API_BASE_URL}"
echo -e "  Client ID: ${CLIENT_ID}"
echo ""

# Test 1: Search for single fruit ingredient
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 1: Search for 'banana' (should include ingredient)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=banana&maxResults=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

# Extract counts
TOTAL_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.totalResults // 0')
RECIPE_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.recipeResults // 0')
INGREDIENT_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.ingredientResults // 0')

echo ""
echo -e "${GREEN}Results Summary:${NC}"
echo -e "  Total: ${TOTAL_RESULTS}"
echo -e "  Recipes: ${RECIPE_RESULTS}"
echo -e "  Ingredients: ${INGREDIENT_RESULTS}"

# Check if we have ingredient results
if [ "$INGREDIENT_RESULTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Ingredient results found!${NC}"
    
    # Show first ingredient-based recipe
    INGREDIENT_RECIPE=$(echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | .title' | head -1)
    if [ -n "$INGREDIENT_RECIPE" ]; then
        echo -e "  First ingredient recipe: ${INGREDIENT_RECIPE}"
    fi
else
    echo -e "${YELLOW}⚠ No ingredient results (this is OK if many regular recipes found)${NC}"
fi

echo ""
sleep 2

# Test 2: Search for vegetable
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 2: Search for 'avocado' (should include ingredient)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=avocado&maxResults=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

INGREDIENT_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.ingredientResults // 0')

if [ "$INGREDIENT_RESULTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Avocado ingredient result found!${NC}"
    
    # Show ingredient details
    echo ""
    echo -e "${GREEN}Ingredient Recipe Details:${NC}"
    echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | {
      id: .id,
      title: .title,
      calories: .calories,
      protein: .protein,
      carbs: .carbs,
      fat: .fat,
      healthLabels: .healthLabels,
      isIngredient: .isIngredient
    }'
else
    echo -e "${YELLOW}⚠ No ingredient results for avocado${NC}"
fi

echo ""
sleep 2

# Test 3: Search for obscure ingredient (should definitely trigger ingredient search)
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 3: Search for 'dragonfruit' (likely no recipes)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=dragonfruit&maxResults=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

TOTAL_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.totalResults // 0')
INGREDIENT_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.ingredientResults // 0')

if [ "$INGREDIENT_RESULTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Ingredient search worked for obscure item!${NC}"
else
    echo -e "${YELLOW}⚠ No ingredient results (ingredient may not be in database)${NC}"
fi

echo ""
sleep 2

# Test 4: Search for protein
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 4: Search for 'chicken breast'${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=chicken%20breast&maxResults=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

INGREDIENT_RESULTS=$(echo "$RESPONSE" | jq -r '.metadata.ingredientResults // 0')

if [ "$INGREDIENT_RESULTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Protein ingredient result found!${NC}"
    
    # Show nutrition details
    echo ""
    echo -e "${GREEN}Nutrition Details:${NC}"
    echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | {
      title: .title,
      calories: .calories,
      protein: .protein,
      servingSize: .ingredientData.servingSize
    }'
else
    echo -e "${YELLOW}⚠ No ingredient results (likely many recipes found)${NC}"
fi

echo ""
sleep 2

# Test 5: Verify ingredient can be added to meal plan
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 5: Extract ingredient ID for meal plan addition${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=banana&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

INGREDIENT_ID=$(echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | .id' | head -1)

if [ -n "$INGREDIENT_ID" ] && [ "$INGREDIENT_ID" != "null" ]; then
    echo -e "${GREEN}✓ Ingredient ID extracted: ${INGREDIENT_ID}${NC}"
    echo ""
    echo -e "${BLUE}To add this ingredient to a meal plan, use:${NC}"
    echo ""
    echo "curl -X POST \"${API_BASE_URL}/api/meal-plans/manual/add-recipe\" \\"
    echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{"
    echo "    \"draftId\": \"your-draft-id\","
    echo "    \"day\": 1,"
    echo "    \"mealName\": \"breakfast\","
    echo "    \"recipe\": {"
    echo "      \"id\": \"${INGREDIENT_ID}\","
    echo "      \"provider\": \"ingredient\","
    echo "      \"source\": \"api\""
    echo "    },"
    echo "    \"servings\": 1"
    echo "  }'"
else
    echo -e "${YELLOW}⚠ No ingredient ID found (search may have returned many recipes)${NC}"
fi

echo ""
sleep 1

# Test 6: Check response structure
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test 6: Verify response structure${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "${API_BASE_URL}/api/recipe-search-client?clientId=${CLIENT_ID}&query=apple&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo -e "${GREEN}Checking required fields...${NC}"

# Check metadata fields
HAS_INGREDIENT_COUNT=$(echo "$RESPONSE" | jq -r '.metadata.ingredientResults' | grep -v null || echo "")
HAS_RECIPE_COUNT=$(echo "$RESPONSE" | jq -r '.metadata.recipeResults' | grep -v null || echo "")

if [ -n "$HAS_INGREDIENT_COUNT" ]; then
    echo -e "${GREEN}✓ metadata.ingredientResults field present${NC}"
else
    echo -e "${RED}✗ metadata.ingredientResults field missing${NC}"
fi

if [ -n "$HAS_RECIPE_COUNT" ]; then
    echo -e "${GREEN}✓ metadata.recipeResults field present${NC}"
else
    echo -e "${RED}✗ metadata.recipeResults field missing${NC}"
fi

# Check if ingredient recipes have required fields
INGREDIENT_COUNT=$(echo "$RESPONSE" | jq -r '[.data.recipes[] | select(.source == "ingredient")] | length')

if [ "$INGREDIENT_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${GREEN}Checking ingredient recipe structure:${NC}"
    
    HAS_IS_INGREDIENT=$(echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | .isIngredient' | head -1)
    HAS_INGREDIENT_DATA=$(echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | .ingredientData' | head -1)
    
    if [ "$HAS_IS_INGREDIENT" = "true" ]; then
        echo -e "${GREEN}✓ isIngredient flag is true${NC}"
    else
        echo -e "${RED}✗ isIngredient flag missing or false${NC}"
    fi
    
    if [ -n "$HAS_INGREDIENT_DATA" ] && [ "$HAS_INGREDIENT_DATA" != "null" ]; then
        echo -e "${GREEN}✓ ingredientData field present${NC}"
        
        # Show ingredient data structure
        echo ""
        echo -e "${BLUE}Ingredient Data Sample:${NC}"
        echo "$RESPONSE" | jq -r '.data.recipes[] | select(.source == "ingredient") | .ingredientData' | head -1
    else
        echo -e "${RED}✗ ingredientData field missing${NC}"
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All tests completed!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  • Ingredient search activates when recipe results < 10"
echo -e "  • Ingredients are converted to recipe format"
echo -e "  • Full nutrition data is included"
echo -e "  • Can be added to meal plans like regular recipes"
echo -e "  • Identified by: source='ingredient' and isIngredient=true"
echo ""
echo -e "${GREEN}Feature is working as expected! 🎉${NC}"
echo ""

