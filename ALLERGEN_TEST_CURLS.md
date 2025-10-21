# Allergen Conflict Detection - Test CURLs

Quick copy-paste curl commands to test the allergen conflict detection feature.

## Setup

```bash
# Set these variables first
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjA0NDI0OTYsImV4cCI6MTc2MTA0NzI5Nn0.YTkvCBlY2HIFvt-902EnIZqSPX60sla0Ox7RUoAxUfE"
export CLIENT_ID="6fe49da4-fc1d-440e-a0f0-a25053831d99"
```

## Test Flow

### 1. Check Current Client Profile

```bash
curl -s "https://caloriescience-api.vercel.app/api/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  name: .client.name,
  currentAllergens: .client.clientGoal.allergies,
  preferences: .client.clientGoal.preferences
}'
```

### 2. Set Client Allergens (dairy, eggs, peanuts)

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"type\": \"client-goal\",
    \"clientId\": \"${CLIENT_ID}\",
    \"allergies\": [\"dairy\", \"eggs\", \"peanuts\"],
    \"preferences\": [\"vegetarian\"],
    \"cuisineTypes\": [\"italian\", \"mediterranean\"],
    \"eerGoalCalories\": 2000,
    \"proteinGoalMin\": 100,
    \"proteinGoalMax\": 150,
    \"carbsGoalMin\": 200,
    \"carbsGoalMax\": 250,
    \"fatGoalMin\": 60,
    \"fatGoalMax\": 80
  }" | jq
```

### 3. Search Recipes (pasta - likely contains dairy/eggs)

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=pasta&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  message: .message,
  totalRecipes: .data.totalResults,
  recipesWithConflicts: .metadata.recipesWithAllergenConflicts,
  sampleRecipes: .data.recipes[0:3] | map({
    id: .id,
    title: .title,
    allergens: .allergens,
    hasConflict: (.allergenConflict.hasConflict // false),
    conflictingAllergens: (.allergenConflict.conflictingAllergens // [])
  })
}'
```

**Expected Output:**
- `recipesWithConflicts`: Number of recipes with allergen warnings
- Each recipe shows `allergenConflict` field if it conflicts
- `conflictingAllergens`: Array of specific allergens found (e.g., `["dairy", "eggs"]`)

### 4. Search for Cheese Pizza (definitely has dairy)

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=cheese%20pizza&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  message: .message,
  recipesWithConflicts: .metadata.recipesWithAllergenConflicts,
  recipes: .data.recipes[0:3] | map({
    title: .title,
    allergens: .allergens,
    hasConflict: (.allergenConflict.hasConflict // false),
    conflictingAllergens: (.allergenConflict.conflictingAllergens // [])
  })
}'
```

**Expected:** All cheese pizza recipes should show `"hasConflict": true` and `"conflictingAllergens": ["dairy"]`

### 5. Create Manual Meal Plan Draft

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/create' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"clientId\": \"${CLIENT_ID}\",
    \"planDate\": \"2025-10-22\",
    \"durationDays\": 1
  }" | jq '{
  success: .success,
  draftId: .data.draftId,
  status: .data.status
}'
```

**Save the draft ID:**
```bash
export DRAFT_ID="<paste-draft-id-here>"
```

### 6. Add Recipe with Allergen Conflict

First, let's get a recipe ID from our search:
```bash
# Get a recipe ID from pasta search
export RECIPE_ID=$(curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=pasta&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.recipes[0].id')

export RECIPE_PROVIDER=$(curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=pasta&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.recipes[0].source')

echo "Recipe ID: ${RECIPE_ID}"
echo "Provider: ${RECIPE_PROVIDER}"
```

Now add it to the meal plan:
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipe\": {
      \"id\": \"${RECIPE_ID}\",
      \"provider\": \"${RECIPE_PROVIDER}\",
      \"source\": \"api\"
    },
    \"servings\": 1
  }" | jq '{
  success: .success,
  message: .message,
  allergenWarning: .allergenWarning
}'
```

**Expected Output (if recipe has allergens):**
```json
{
  "success": true,
  "message": "Recipe added successfully (with allergen warning)",
  "allergenWarning": {
    "hasConflict": true,
    "conflictingAllergens": ["dairy", "eggs"],
    "message": "⚠️ Warning: This recipe contains allergen(s) that conflict with client preferences: dairy, eggs"
  }
}
```

### 7. Try Adding a Recipe WITHOUT Conflict

Search for a vegan recipe (no dairy, eggs, or animal products):
```bash
# Search for vegan recipes
export VEGAN_RECIPE_ID=$(curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=vegan%20salad&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.recipes[0].id')

export VEGAN_PROVIDER=$(curl -s "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=${CLIENT_ID}&query=vegan%20salad&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.recipes[0].source')

# Add vegan recipe
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"draftId\": \"${DRAFT_ID}\",
    \"day\": 1,
    \"mealName\": \"lunch\",
    \"recipe\": {
      \"id\": \"${VEGAN_RECIPE_ID}\",
      \"provider\": \"${VEGAN_PROVIDER}\",
      \"source\": \"api\"
    },
    \"servings\": 1
  }" | jq '{
  success: .success,
  message: .message,
  allergenWarning: .allergenWarning
}'
```

**Expected:** No `allergenWarning` field in response (or `null`)

## Quick Test (All in One)

Run the automated test script:

```bash
cd /Users/mrinal/caloriescience-app
./test-allergen-conflicts.sh
```

## What to Look For

### ✅ Recipe Search API
- Each recipe has `allergenConflict` field when there's a conflict
- `conflictingAllergens` shows exact allergens: `["dairy", "eggs"]`
- `metadata.recipesWithAllergenConflicts` shows count
- Message includes warning count: "Found 20 recipes (5 with allergen warnings)"

### ✅ Manual Meal Plan Add Recipe API
- Response includes `allergenWarning` object when conflict detected
- `conflictingAllergens` array shows specific allergens
- Success message changes to: "Recipe added successfully (with allergen warning)"
- Recipe is still added (non-blocking), but nutritionist is warned

### ❌ No Conflict Case
- No `allergenConflict` field in recipe objects
- No `allergenWarning` in add-recipe response
- Standard success message

## Troubleshooting

### If no allergen conflicts are detected:
1. Verify client allergens are set: `curl -s "${API_BASE}/api/clients/${CLIENT_ID}" -H "Authorization: Bearer ${TOKEN}" | jq '.client.clientGoal.allergies'`
2. Check recipe allergen data: Look at `allergens` field in recipe search results
3. Try searching for recipes that definitely contain allergens (e.g., "cheese pizza", "scrambled eggs", "peanut butter")

### If recipes don't have allergen data:
- Bon Happetee recipes have the most complete allergen data
- Some Edamam/Spoonacular recipes may have limited allergen info
- Health labels can be used as fallback (e.g., if NOT "dairy-free", might contain dairy)

