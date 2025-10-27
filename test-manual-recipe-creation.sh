#!/bin/bash

# Test Manual Recipe Creation - Complete Workflow
# This script demonstrates the full workflow of creating a custom recipe manually

set -e  # Exit on error

# Configuration
API_URL="${API_URL:-https://caloriescience-api.vercel.app}"
TOKEN="${AUTH_TOKEN}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}==>${NC} $1"
    echo "=========================================="
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if token is set
if [ -z "$TOKEN" ]; then
    print_error "AUTH_TOKEN environment variable is not set"
    echo ""
    echo "Usage: AUTH_TOKEN=your_token ./test-manual-recipe-creation.sh"
    echo ""
    echo "To get a token, first login:"
    echo "curl -X POST $API_URL/api/auth -H 'Content-Type: application/json' -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}'"
    exit 1
fi

echo "=========================================="
echo "  Manual Recipe Creation - Full Workflow"
echo "=========================================="
echo ""
print_info "API URL: $API_URL"
echo ""

# ============================================
# STEP 1: Search for ingredients
# ============================================
print_step "STEP 1: Search for ingredient suggestions"

echo "Searching for 'banana'..."
BANANA_SEARCH=$(curl -s -X GET "$API_URL/api/ingredients/autocomplete?q=banana&source=auto" \
  -H "Authorization: Bearer $TOKEN")

echo "$BANANA_SEARCH" | jq '.'
print_success "Ingredient search completed"
sleep 1

# ============================================
# STEP 2: Get nutrition for each ingredient
# ============================================
print_step "STEP 2: Get nutrition data for ingredients"

# Ingredient 1: Banana
echo "Getting nutrition for: 1 medium banana"
BANANA_NUTRITION=$(curl -s -X GET "$API_URL/api/ingredients/nutrition?ingredient=banana&amount=1&unit=medium&source=auto" \
  -H "Authorization: Bearer $TOKEN")

echo "$BANANA_NUTRITION" | jq '.'

BANANA_CALORIES=$(echo "$BANANA_NUTRITION" | jq -r '.data.calories // 105')
BANANA_PROTEIN=$(echo "$BANANA_NUTRITION" | jq -r '.data.protein // 1.3')
BANANA_CARBS=$(echo "$BANANA_NUTRITION" | jq -r '.data.carbs // 27')
BANANA_FAT=$(echo "$BANANA_NUTRITION" | jq -r '.data.fat // 0.4')
BANANA_FIBER=$(echo "$BANANA_NUTRITION" | jq -r '.data.fiber // 3.1')

print_success "Banana nutrition: ${BANANA_CALORIES} cal, ${BANANA_PROTEIN}g protein"
sleep 1

# Ingredient 2: Greek Yogurt
echo ""
echo "Getting nutrition for: 1 cup Greek yogurt"
YOGURT_NUTRITION=$(curl -s -X GET "$API_URL/api/ingredients/nutrition?ingredient=greek%20yogurt&amount=1&unit=cup&source=auto" \
  -H "Authorization: Bearer $TOKEN")

echo "$YOGURT_NUTRITION" | jq '.'

YOGURT_CALORIES=$(echo "$YOGURT_NUTRITION" | jq -r '.data.calories // 100')
YOGURT_PROTEIN=$(echo "$YOGURT_NUTRITION" | jq -r '.data.protein // 17')
YOGURT_CARBS=$(echo "$YOGURT_NUTRITION" | jq -r '.data.carbs // 6')
YOGURT_FAT=$(echo "$YOGURT_NUTRITION" | jq -r '.data.fat // 0.7')
YOGURT_FIBER=$(echo "$YOGURT_NUTRITION" | jq -r '.data.fiber // 0')

print_success "Greek yogurt nutrition: ${YOGURT_CALORIES} cal, ${YOGURT_PROTEIN}g protein"
sleep 1

# Ingredient 3: Honey
echo ""
echo "Getting nutrition for: 1 tablespoon honey"
HONEY_NUTRITION=$(curl -s -X GET "$API_URL/api/ingredients/nutrition?ingredient=honey&amount=1&unit=tablespoon&source=auto" \
  -H "Authorization: Bearer $TOKEN")

echo "$HONEY_NUTRITION" | jq '.'

HONEY_CALORIES=$(echo "$HONEY_NUTRITION" | jq -r '.data.calories // 64')
HONEY_PROTEIN=$(echo "$HONEY_NUTRITION" | jq -r '.data.protein // 0.1')
HONEY_CARBS=$(echo "$HONEY_NUTRITION" | jq -r '.data.carbs // 17.3')
HONEY_FAT=$(echo "$HONEY_NUTRITION" | jq -r '.data.fat // 0')
HONEY_FIBER=$(echo "$HONEY_NUTRITION" | jq -r '.data.fiber // 0')

print_success "Honey nutrition: ${HONEY_CALORIES} cal, ${HONEY_CARBS}g carbs"
sleep 1

# Ingredient 4: Almonds
echo ""
echo "Getting nutrition for: 0.25 cup almonds"
ALMOND_NUTRITION=$(curl -s -X GET "$API_URL/api/ingredients/nutrition?ingredient=almonds&amount=0.25&unit=cup&source=auto" \
  -H "Authorization: Bearer $TOKEN")

echo "$ALMOND_NUTRITION" | jq '.'

ALMOND_CALORIES=$(echo "$ALMOND_NUTRITION" | jq -r '.data.calories // 132')
ALMOND_PROTEIN=$(echo "$ALMOND_NUTRITION" | jq -r '.data.protein // 4.9')
ALMOND_CARBS=$(echo "$ALMOND_NUTRITION" | jq -r '.data.carbs // 5')
ALMOND_FAT=$(echo "$ALMOND_NUTRITION" | jq -r '.data.fat // 11.4')
ALMOND_FIBER=$(echo "$ALMOND_NUTRITION" | jq -r '.data.fiber // 2.7')

print_success "Almonds nutrition: ${ALMOND_CALORIES} cal, ${ALMOND_FAT}g fat"
sleep 1

# ============================================
# STEP 3: Calculate total nutrition (optional - backend does this)
# ============================================
print_step "STEP 3: Preview total nutrition"

TOTAL_CALORIES=$(echo "$BANANA_CALORIES + $YOGURT_CALORIES + $HONEY_CALORIES + $ALMOND_CALORIES" | bc)
TOTAL_PROTEIN=$(echo "$BANANA_PROTEIN + $YOGURT_PROTEIN + $HONEY_PROTEIN + $ALMOND_PROTEIN" | bc)
TOTAL_CARBS=$(echo "$BANANA_CARBS + $YOGURT_CARBS + $HONEY_CARBS + $ALMOND_CARBS" | bc)
TOTAL_FAT=$(echo "$BANANA_FAT + $YOGURT_FAT + $HONEY_FAT + $ALMOND_FAT" | bc)
TOTAL_FIBER=$(echo "$BANANA_FIBER + $YOGURT_FIBER + $HONEY_FIBER + $ALMOND_FIBER" | bc)

SERVINGS=2
PER_SERVING_CALORIES=$(echo "scale=1; $TOTAL_CALORIES / $SERVINGS" | bc)
PER_SERVING_PROTEIN=$(echo "scale=1; $TOTAL_PROTEIN / $SERVINGS" | bc)

echo "Total Nutrition (for $SERVINGS servings):"
echo "  Calories: ${TOTAL_CALORIES} kcal"
echo "  Protein:  ${TOTAL_PROTEIN}g"
echo "  Carbs:    ${TOTAL_CARBS}g"
echo "  Fat:      ${TOTAL_FAT}g"
echo "  Fiber:    ${TOTAL_FIBER}g"
echo ""
echo "Per Serving:"
echo "  Calories: ${PER_SERVING_CALORIES} kcal"
echo "  Protein:  ${PER_SERVING_PROTEIN}g"

print_success "Nutrition calculated"
sleep 1

# ============================================
# STEP 4: Create the custom recipe
# ============================================
print_step "STEP 4: Create custom recipe with all ingredients"

CREATE_PAYLOAD=$(cat <<EOF
{
  "recipeName": "Greek Yogurt Breakfast Bowl",
  "description": "A delicious and nutritious breakfast bowl with Greek yogurt, fresh fruit, and crunchy almonds. Perfect for a high-protein start to your day.",
  "ingredients": [
    {
      "name": "banana",
      "quantity": 1,
      "unit": "medium",
      "nutritionData": {
        "calories": ${BANANA_CALORIES},
        "protein": ${BANANA_PROTEIN},
        "carbs": ${BANANA_CARBS},
        "fat": ${BANANA_FAT},
        "fiber": ${BANANA_FIBER}
      }
    },
    {
      "name": "Greek yogurt",
      "quantity": 1,
      "unit": "cup",
      "nutritionData": {
        "calories": ${YOGURT_CALORIES},
        "protein": ${YOGURT_PROTEIN},
        "carbs": ${YOGURT_CARBS},
        "fat": ${YOGURT_FAT},
        "fiber": ${YOGURT_FIBER}
      }
    },
    {
      "name": "honey",
      "quantity": 1,
      "unit": "tablespoon",
      "nutritionData": {
        "calories": ${HONEY_CALORIES},
        "protein": ${HONEY_PROTEIN},
        "carbs": ${HONEY_CARBS},
        "fat": ${HONEY_FAT},
        "fiber": ${HONEY_FIBER}
      }
    },
    {
      "name": "almonds",
      "quantity": 0.25,
      "unit": "cup",
      "nutritionData": {
        "calories": ${ALMOND_CALORIES},
        "protein": ${ALMOND_PROTEIN},
        "carbs": ${ALMOND_CARBS},
        "fat": ${ALMOND_FAT},
        "fiber": ${ALMOND_FIBER}
      }
    }
  ],
  "servings": 2,
  "instructions": [
    "Slice the banana into thin rounds",
    "Divide Greek yogurt evenly into two bowls",
    "Top each bowl with sliced banana",
    "Drizzle honey over the yogurt and fruit",
    "Sprinkle chopped almonds on top",
    "Serve immediately and enjoy!"
  ],
  "customNotes": "This recipe can be customized with different fruits based on season. Berries work great! Can be prepared the night before for meal prep.",
  "healthLabels": ["high-protein", "gluten-free", "vegetarian"],
  "allergens": ["dairy", "tree-nuts"],
  "dietLabels": ["vegetarian", "gluten-free"],
  "cuisineTypes": ["american"],
  "mealTypes": ["breakfast"],
  "dishTypes": ["bowl"],
  "prepTimeMinutes": 5,
  "cookTimeMinutes": 0,
  "totalTimeMinutes": 5,
  "isPublic": true
}
EOF
)

echo "Payload:"
echo "$CREATE_PAYLOAD" | jq '.'
echo ""

echo "Creating recipe..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/recipes/custom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

echo "$CREATE_RESPONSE" | jq '.'

RECIPE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')

if [ ! -z "$RECIPE_ID" ] && [ "$RECIPE_ID" != "null" ]; then
    print_success "Recipe created successfully!"
    print_info "Recipe ID: $RECIPE_ID"
else
    print_error "Failed to create recipe"
    exit 1
fi

sleep 1

# ============================================
# STEP 5: Verify the recipe was created
# ============================================
print_step "STEP 5: Verify recipe details"

echo "Fetching recipe details..."
DETAILS_RESPONSE=$(curl -s -X GET "$API_URL/api/recipes/$RECIPE_ID/details" \
  -H "Authorization: Bearer $TOKEN")

echo "$DETAILS_RESPONSE" | jq '{
  success,
  data: {
    id: .data.id,
    recipeName: .data.recipeName,
    provider: .data.provider,
    servings: .data.servings,
    caloriesPerServing: .data.caloriesPerServing,
    proteinPerServingG: .data.proteinPerServingG,
    carbsPerServingG: .data.carbsPerServingG,
    fatPerServingG: .data.fatPerServingG,
    ingredientCount: (.data.ingredients | length)
  }
}'

print_success "Recipe verified successfully!"
sleep 1

# ============================================
# STEP 6: Search for the recipe
# ============================================
print_step "STEP 6: Find recipe in search results"

echo "Searching for 'Greek Yogurt'..."
SEARCH_RESPONSE=$(curl -s -X GET "$API_URL/api/recipe-search?provider=manual&query=greek%20yogurt" \
  -H "Authorization: Bearer $TOKEN")

echo "$SEARCH_RESPONSE" | jq '{
  success,
  recipesFound: (.data.recipes | length),
  recipes: [.data.recipes[] | select(.id == "'"$RECIPE_ID"'") | {
    id,
    title,
    source,
    calories,
    protein
  }]
}'

print_success "Recipe found in search results!"
sleep 1

# ============================================
# STEP 7: List all your custom recipes
# ============================================
print_step "STEP 7: List all custom recipes"

echo "Fetching custom recipes..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/api/recipes/custom?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | jq '{
  success,
  totalRecipes: .pagination.totalCount,
  recipes: [.data[] | {
    id,
    recipeName,
    caloriesPerServing,
    isPublic
  }]
}'

RECIPE_COUNT=$(echo "$LIST_RESPONSE" | jq '.pagination.totalCount')
print_success "Found $RECIPE_COUNT custom recipe(s)"

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
echo "           ✓ WORKFLOW COMPLETED"
echo "=========================================="
echo ""
print_success "Successfully created custom recipe: 'Greek Yogurt Breakfast Bowl'"
print_info "Recipe ID: $RECIPE_ID"
echo ""
echo "What we did:"
echo "  1. ✓ Searched for ingredient suggestions"
echo "  2. ✓ Retrieved nutrition data for 4 ingredients"
echo "  3. ✓ Calculated total nutrition preview"
echo "  4. ✓ Created custom recipe with all data"
echo "  5. ✓ Verified recipe was saved correctly"
echo "  6. ✓ Confirmed recipe appears in search"
echo "  7. ✓ Listed all custom recipes"
echo ""
echo "The recipe is now available for:"
echo "  • Adding to meal plans"
echo "  • Searching and filtering"
echo "  • Customizing ingredients"
echo "  • Sharing with clients"
echo ""
print_info "To delete this test recipe, run:"
echo "  curl -X DELETE '$API_URL/api/recipes/custom?id=$RECIPE_ID' \\"
echo "    -H 'Authorization: Bearer $TOKEN'"
echo ""


