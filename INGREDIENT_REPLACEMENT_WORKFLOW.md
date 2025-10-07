# Ingredient Replacement Workflow - Testing Guide

This guide demonstrates the complete workflow for ingredient replacement in meal plans.

## Prerequisites
- JWT Token for authentication
- A draft meal plan with selected recipes

## Workflow Steps

### Step 1: Generate a Meal Plan Draft

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/generate' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "clientId": "a376c7f1-d053-4ead-809d-00f46ca7d2c8",
    "days": 1,
    "startDate": "2025-10-03"
}'
```

**Response**: Save the `draftId` from the response.

---

### Step 2: Get Draft Status (Check Meal Sources)

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "get-draft-status",
    "draftId": "YOUR_DRAFT_ID"
}'
```

**Response**: Note which meals are from `edamam` vs `spoonacular` sources.

---

### Step 3: Select a Recipe

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "select-recipe",
    "draftId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "YOUR_RECIPE_ID"
}'
```

**Response**: Recipe is selected and ready for ingredient replacement.

---

### Step 4: Get Ingredient Suggestions (Source-Aware)

#### For Edamam Recipes:
```bash
curl --location 'https://caloriescience-api.vercel.app/api/ingredients/autocomplete?q=chicken&source=edamam&mode=with_units' \
--header 'authorization: Bearer YOUR_JWT_TOKEN'
```

#### For Spoonacular Recipes (with substitutes):
```bash
curl --location 'https://caloriescience-api.vercel.app/api/ingredients/autocomplete?q=chicken&source=spoonacular&mode=with_substitutes&recipeId=YOUR_RECIPE_ID&ingredientId=YOUR_INGREDIENT_ID' \
--header 'authorization: Bearer YOUR_JWT_TOKEN'
```

**Response**: 
- `suggestions`: List of ingredient suggestions
- `unitSuggestions`: Recommended units for each ingredient
- `substitutes`: Alternative ingredients (Spoonacular only)

---

### Step 5: Get Nutrition for New Ingredient

```bash
curl --location 'https://caloriescience-api.vercel.app/api/ingredients/nutrition?ingredient=tofu&source=edamam&amount=100&unit=gram' \
--header 'authorization: Bearer YOUR_JWT_TOKEN'
```

**Response**: Complete nutrition data for the new ingredient.

---

### Step 6: Replace Ingredient in Meal Plan

```bash
curl --location 'https://caloriescience-api.vercel.app/api/ingredients/replace' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "replace-ingredient",
    "draftId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "YOUR_RECIPE_ID",
    "originalIngredient": "100 gram chicken breast",
    "newIngredient": "tofu",
    "amount": 100,
    "unit": "gram",
    "source": "edamam"
}'
```

**Response**: 
```json
{
  "success": true,
  "data": {
    "message": "Ingredient replaced successfully",
    "replacement": {
      "originalIngredient": "100 gram chicken breast",
      "newIngredient": "100 gram tofu",
      "source": "edamam",
      "nutritionImpact": {
        "originalIngredient": {
          "calories": 165,
          "protein": 31,
          "carbs": 0,
          "fat": 3.6,
          "fiber": 0
        },
        "newIngredient": {
          "calories": 76,
          "protein": 8.2,
          "carbs": 1.9,
          "fat": 4.8,
          "fiber": 0.3
        },
        "difference": {
          "calories": -89,
          "protein": -22.8,
          "carbs": 1.9,
          "fat": 1.2,
          "fiber": 0.3
        }
      },
      "recipeNutrition": {
        "before": {
          "calories": 450,
          "protein": 45,
          "carbs": 30,
          "fat": 15,
          "fiber": 3
        },
        "after": {
          "calories": 361,
          "protein": 22.2,
          "carbs": 31.9,
          "fat": 16.2,
          "fiber": 3.3
        },
        "servings": 2
      }
    },
    "updatedStatus": {
      "totalNutrition": { ... }
    }
  }
}
```

**Key Features**:
- ✅ Correct nutrition calculation: `(Total Recipe) - (Old Ingredient) + (New Ingredient)`
- ✅ Per-serving vs. total recipe calculations handled correctly
- ✅ Shows nutrition impact and difference
- ✅ Updates overall draft nutrition totals

---

### Step 7: Verify Changes (Get Updated Draft Status)

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "get-draft-status",
    "draftId": "YOUR_DRAFT_ID"
}'
```

**Response**: Verify that `totalNutrition` reflects the ingredient replacement.

---

### Step 8: Get Full Draft Details (Optional)

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "get-draft",
    "draftId": "YOUR_DRAFT_ID"
}'
```

**Response**: Full draft with all customizations and modifications.

---

### Step 9: Finalize Meal Plan

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
--header 'authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "action": "finalize-draft",
    "draftId": "YOUR_DRAFT_ID"
}'
```

**Response**: Final meal plan with all customizations applied.

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/meal-plans/generate` | POST | Generate meal plan draft |
| `/api/meal-plans/draft` | POST | Manage drafts (status, select, finalize) |
| `/api/ingredients/autocomplete` | GET | Get ingredient suggestions + substitutes |
| `/api/ingredients/nutrition` | GET | Get nutrition data for ingredient |
| `/api/ingredients/replace` | POST | Replace ingredient in meal plan |

---

## Source-Aware Behavior

### Edamam Recipes
- Use `source=edamam` for autocomplete
- Get Edamam nutrition data
- Use Edamam-supported units (gram, ounce, cup, etc.)

### Spoonacular Recipes
- Use `source=spoonacular` for autocomplete
- Use `mode=with_substitutes` to get alternative ingredients
- Get Spoonacular nutrition data
- Include `recipeId` and `ingredientId` for substitutes

---

## How Ingredient Replacement Works

### Nutrition Calculation Logic

The system uses a sophisticated approach to ensure accurate nutrition when replacing ingredients:

**Formula**: `New Recipe Nutrition = (Original Recipe Total) - (Original Ingredient) + (New Ingredient)`

**Step-by-Step Process**:

1. **Get Original Recipe Nutrition** (per serving)
   - Example: 450 cal, 45g protein (for 2 servings)

2. **Calculate Total Recipe Nutrition** (all servings)
   - Total = 450 cal × 2 = 900 cal
   - Total protein = 45g × 2 = 90g

3. **Get Original Ingredient Nutrition**
   - Example: "100g chicken breast" = 165 cal, 31g protein

4. **Get New Ingredient Nutrition**
   - Example: "100g tofu" = 76 cal, 8.2g protein

5. **Calculate New Total Recipe Nutrition**
   - New Total Calories = 900 - 165 + 76 = 811 cal
   - New Total Protein = 90 - 31 + 8.2 = 67.2g

6. **Convert Back to Per-Serving**
   - New Per Serving = 811 ÷ 2 = 405.5 cal (rounded to 406)
   - New Protein = 67.2 ÷ 2 = 33.6g

### Important Considerations

1. **Ingredient Text Format**: The `originalIngredient` should include amount and unit to get accurate nutrition
   - ✅ Correct: `"100 gram chicken breast"`
   - ❌ Wrong: `"chicken breast"` (will give nutrition for default amount)

2. **Multiple Replacements**: Each replacement is cumulative
   - First replacement: Recipe - Ingredient1 + NewIngredient1
   - Second replacement: (Updated Recipe) - Ingredient2 + NewIngredient2

3. **Servings**: The system automatically handles per-serving calculations
   - Nutrition is always stored per serving in the recipe
   - Calculations are done on total recipe, then converted back

4. **Source Accuracy**: Use the correct source (edamam/spoonacular) that matches the recipe
   - Each source has different ingredient databases
   - Nutrition data may vary slightly between sources

---

## Testing Notes

1. **JWT Token**: Generate using `/scripts/generate-jwt.js`
2. **Draft Expiration**: Drafts expire after 7 days
3. **Nutrition Accuracy**: Amounts and units are crucial for accurate nutrition
4. **Error Handling**: All APIs return detailed error messages
5. **Source Detection**: System automatically uses correct API based on `source` parameter
6. **Ingredient Format**: Always include amount and unit in `originalIngredient` for accurate calculations

---

## Example Complete Flow

```bash
# 1. Generate draft (save draftId)
DRAFT_ID=$(curl -s ... | jq -r '.data.draftId')

# 2. Select recipe (save recipeId and source)
RECIPE_ID="recipe_123"
SOURCE="edamam"

# 3. Get ingredient suggestions
curl "...autocomplete?q=chicken&source=$SOURCE&mode=with_units"

# 4. Get nutrition for replacement
curl "...nutrition?ingredient=tofu&source=$SOURCE&amount=100&unit=gram"

# 5. Replace ingredient
curl -X POST ...replace -d '{...}'

# 6. Verify changes
curl -X POST ...draft -d '{"action":"get-draft-status","draftId":"'$DRAFT_ID'"}'

# 7. Finalize
curl -X POST ...draft -d '{"action":"finalize-draft","draftId":"'$DRAFT_ID'"}'
```

