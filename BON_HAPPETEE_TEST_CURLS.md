# Bon Happetee Integration - Test CURLs

## Setup

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjA0NDI0OTYsImV4cCI6MTc2MTA0NzI5Nn0.YTkvCBlY2HIFvt-902EnIZqSPX60sla0Ox7RUoAxUfE"
CLIENT_ID="256e827e-040d-4c19-8540-c9299a7a3ab8"
```

## 1. Search Bon Happetee (Direct API)

```bash
curl -s 'https://api.bonhappetee.com/search?value=chicken curry' \
  -H 'x-api-key: fjRosLrdMT3lRmLIwAAgR6ouHRx9xd5zadHbK4ax' | jq '.[:3] | map({
    food_unique_id,
    common_names,
    calories: .nutrients.calories,
    protein: .nutrients.protein
  })'
```

## 2. Get Food Details (Direct API)

```bash
# Example food ID from search results
FOOD_ID="292209f9-4d43-4c4a-bd90-c9a63bbce447"

curl -s "https://api.bonhappetee.com/food?food_item_id=$FOOD_ID" \
  -H 'x-api-key: fjRosLrdMT3lRmLIwAAgR6ouHRx9xd5zadHbK4ax' | jq '{
    food_name,
    common_names,
    servings: 1,
    calories: (.nutrients[] | select(.nutrient_tag_name == "ENERC_KCAL") | .measure),
    protein: (.nutrients[] | select(.nutrient_tag_name == "PROCNT") | .measure),
    iron: (.nutrients[] | select(.nutrient_tag_name == "FE") | .measure),
    vitaminC: (.nutrients[] | select(.nutrient_tag_name == "VITC") | .measure),
    measures: .measures | map(.unit_name)
  }'
```

## 3. Get Allergen Info (Direct API)

```bash
curl -s "https://api.bonhappetee.com/food/disorder?food_item_id=$FOOD_ID" \
  -H 'x-api-key: fjRosLrdMT3lRmLIwAAgR6ouHRx9xd5zadHbK4ax' | jq '{
    food_name,
    allergens,
    positive_health,
    negative_health,
    disorders: .disorder_data | map(.disorder_name)
  }'
```

## 4. Create Manual Meal Plan

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/create' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"planDate\": \"2025-10-26\",
    \"durationDays\": 1
  }" | jq '{success, draftId: .data.draftId}'

# Save the draft ID
DRAFT_ID="manual-uuid-from-response"
```

## 5. Add Bon Happetee Recipe to Manual Meal Plan

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"lunch\",
    \"recipe\": {
      \"id\": \"292209f9-4d43-4c4a-bd90-c9a63bbce447\",
      \"provider\": \"bonhappetee\",
      \"source\": \"api\"
    }
  }" | jq '{
  success,
  lunch: .data.suggestions[0].meals.lunch | {
    recipeCount: (.recipes | length),
    recipes: .recipes | map({
      title,
      source,
      allergens,
      calories,
      protein
    }),
    totalNutrition: .totalNutrition | {
      calories: .calories.quantity,
      protein: .macros.protein.quantity,
      iron: .micros.minerals.iron.quantity,
      vitaminC: .micros.vitamins.vitaminC.quantity
    }
  }
}'
```

## 6. Get Draft with Bon Happetee Recipe

```bash
curl -s "https://caloriescience-api.vercel.app/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{
  draft: {
    id: .data.id,
    status: .data.status
  },
  lunch: .data.suggestions[0].meals.lunch | {
    recipes: .recipes | map({
      title,
      source,
      allergens,
      hasVitamins: (.nutrition.micros.vitamins | length > 0),
      hasMinerals: (.nutrition.micros.minerals | length > 0)
    }),
    totalNutrition: .totalNutrition | {
      calories: .calories.quantity,
      protein: .macros.protein.quantity,
      carbs: .macros.carbs.quantity,
      fat: .macros.fat.quantity,
      iron: .micros.minerals.iron.quantity,
      calcium: .micros.minerals.calcium.quantity,
      vitaminC: .micros.vitamins.vitaminC.quantity
    }
  },
  nutrition: {
    day1Total: .data.nutrition.dayWise[0].dayTotal.calories.quantity,
    overall: .data.nutrition.overall.calories.quantity
  }
}'
```

## 7. Mix Providers in Same Meal

Test adding Bon Happetee + Spoonacular + Edamam to same meal:

```bash
# Add Bon Happetee (Indian food)
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"dinner\",
    \"recipe\": {
      \"id\": \"292209f9-4d43-4c4a-bd90-c9a63bbce447\",
      \"provider\": \"bonhappetee\",
      \"source\": \"api\"
    }
  }"

# Add Spoonacular
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"dinner\",
    \"recipe\": {
      \"id\": \"663235\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }"

# Add Edamam
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"dinner\",
    \"recipe\": {
      \"id\": \"recipe_e6ccf64507362f20be072461a937f3d3\",
      \"provider\": \"edamam\",
      \"source\": \"api\"
    }
  }"

# Check mixed provider nutrition
curl -s "https://caloriescience-api.vercel.app/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.suggestions[0].meals.dinner | {
  recipeCount: (.recipes | length),
  providers: .recipes | map(.source),
  allergens: .recipes | map(.allergens) | flatten | unique,
  totalCalories: .totalNutrition.calories.quantity,
  totalProtein: .totalNutrition.macros.protein.quantity,
  totalIron: .totalNutrition.micros.minerals.iron.quantity
}'
```

## 8. Verify Allergens in Cache

After adding a Bon Happetee recipe, check the database:

```sql
SELECT 
  provider,
  recipe_name,
  allergens,
  health_labels,
  cuisine_types,
  calories_per_serving,
  nutrition_details::jsonb->'micros'->'vitamins' as vitamins
FROM cached_recipes 
WHERE provider = 'bonhappetee'
ORDER BY created_at DESC 
LIMIT 3;
```

## Expected Results

### Bon Happetee Recipe
- ✅ Has full macros (calories, protein, carbs, fat, fiber, sugar, sodium)
- ✅ Has vitamins (A, C, D, E, K, B6, B12, folate, etc.)
- ✅ Has minerals (calcium, iron, magnesium, zinc, etc.)
- ✅ Has explicit allergens array (e.g., ["milk"])
- ✅ Has health labels (low sugar, high protein, etc.)
- ✅ Has cuisine type (e.g., "indian")
- ✅ Cached properly with allergens column

### Mixed Provider Meal
- ✅ Nutrition summed correctly across all providers
- ✅ Allergens collected from all recipes
- ✅ Each recipe maintains its provider-specific data

