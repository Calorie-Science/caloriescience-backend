# Edamam Nutrition Servings Multiplication Bug Fix

## Issue
When fetching Edamam recipes in `/api/recipes/customized`, the nutrition values were being **multiplied by servings** incorrectly, showing much higher calories than the actual per-serving values.

### Example
- Expected (per serving): **941.76 kcal**
- Actual (incorrect): **4708.8 kcal** (941.76 × 5 servings)

### Root Cause
Edamam API returns **TOTAL nutrition for the entire recipe** (all servings), not per-serving values. The `transformEdamamNutrition` method in `NutritionMappingService` was **not dividing by servings**, so it returned total values instead of per-serving values.

When other services (like `multiProviderRecipeSearchService`) fetched Edamam recipes, they correctly divided by servings:

```typescript
// CORRECT: multiProviderRecipeSearchService (line 539-545)
const servings = recipe.yield || 1;
const caloriesPerServing = Math.round(recipe.calories / servings);
const proteinPerServing = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 10) / 10;
```

But `transformEdamamNutrition` did NOT:

```typescript
// WRONG: transformEdamamNutrition (before fix)
const value = totalNutrients[edamamKey].quantity;  // This is TOTAL, not per-serving
nutrition.calories = { quantity: value, unit: 'kcal' };  // Wrong!
```

## The Fix

### 1. Updated `transformEdamamNutrition` Method

Added a `servings` parameter and now divides by servings to get **per-serving** values:

```typescript
// lib/nutritionMappingService.ts
static transformEdamamNutrition(edamamData: any, servings?: number): StandardizedNutrition {
  // Determine servings
  let recipeServings: number = servings || 1;
  
  if (edamamData.totalNutrients) {
    // Recipe format: use provided servings or get from recipe
    if (!servings && edamamData.yield) {
      recipeServings = edamamData.yield;
    }
  } else if (edamamData.ingredients) {
    // Ingredient format: already per the specified amount
    recipeServings = 1;
  }
  
  // Divide by servings to get PER-SERVING values
  const totalValue = totalNutrients[edamamKey].quantity;
  const perServingValue = Math.round((totalValue / recipeServings) * 100) / 100;
  
  nutrition.calories = { quantity: perServingValue, unit: 'kcal' };
}
```

### 2. Updated All Call Sites

Updated every place where `transformEdamamNutrition` is called to pass the servings parameter:

#### a. `/api/recipes/customized.ts` (2 locations)

```typescript
// When extracting from cached originalApiResponse
const recipeServings = cached.servings || originalResponse.yield || 1;
nutritionDetails = NutritionMappingService.transformEdamamNutrition(originalResponse, recipeServings);

// When fetching fresh from API
const recipeServings = freshRecipeDetails.servings || freshRecipeDetails.nutrition.yield || 1;
nutritionDetails = NutritionMappingService.transformEdamamNutrition(freshRecipeDetails.nutrition, recipeServings);
```

#### b. `/lib/mealPlanDraftService.ts`

```typescript
const recipeServings = recipeDetails.servings || (recipeDetails as any).nutrition?.yield || 1;
nutritionDetails = NutritionMappingService.transformEdamamNutrition((recipeDetails as any).nutrition, recipeServings);
```

#### c. `/api/recipes/[id]/details.ts`

```typescript
const recipeServings = cachedRecipe?.servings || originalResponse.yield || 1;
standardizedRecipe.nutritionDetails = NutritionMappingService.transformEdamamNutrition(originalResponse, recipeServings);
```

## How It Works

### Edamam Recipe Format
Edamam returns nutrition like this:
```json
{
  "yield": 4,
  "totalNutrients": {
    "ENERC_KCAL": { "quantity": 2000, "unit": "kcal" },  // TOTAL for all 4 servings
    "PROCNT": { "quantity": 80, "unit": "g" }            // TOTAL for all 4 servings
  }
}
```

### After Transformation (Now Correct)
```json
{
  "calories": { "quantity": 500, "unit": "kcal" },  // 2000 / 4 = 500 per serving ✅
  "macros": {
    "protein": { "quantity": 20, "unit": "g" }      // 80 / 4 = 20 per serving ✅
  }
}
```

### Edamam Ingredient Format
For ingredient nutrition (when getting nutrition for a specific ingredient amount), servings is always 1:
```json
{
  "ingredients": [{
    "parsed": [{
      "nutrients": {
        "ENERC_KCAL": { "quantity": 70, "unit": "kcal" }  // Already per the specified amount
      }
    }]
  }]
}
```

## Testing

### Before Fix
```bash
# Get customized recipe with 5 servings Edamam recipe
curl .../api/recipes/customized?recipeId=recipe_xxx&...

# Response showed:
# caloriesPerServing: "4708.8"  ❌ (WRONG - multiplied by servings)
```

### After Fix
```bash
# Same request
curl .../api/recipes/customized?recipeId=recipe_xxx&...

# Response now shows:
# caloriesPerServing: "941.76"  ✅ (CORRECT - per serving)
```

## Why This Bug Existed

1. **Different Sources, Different Formats**: 
   - Edamam returns **TOTAL** nutrition
   - Spoonacular returns **PER-SERVING** nutrition
   
2. **Inconsistent Handling**:
   - `multiProviderRecipeSearchService` correctly divided by servings
   - `transformEdamamNutrition` did NOT divide by servings
   - This caused discrepancies depending on which path was used

3. **Impact**:
   - `/api/recipes/customized` was showing inflated nutrition values
   - This made customized Edamam recipes appear to have much more calories than they actually had

## Files Modified

1. **`lib/nutritionMappingService.ts`**
   - Added `servings` parameter to `transformEdamamNutrition`
   - Divides all nutrition values by servings to get per-serving values

2. **`api/recipes/customized.ts`**
   - Passes servings when calling `transformEdamamNutrition` (2 locations)

3. **`lib/mealPlanDraftService.ts`**
   - Passes servings when caching Edamam recipes

4. **`api/recipes/[id]/details.ts`**
   - Passes servings when extracting nutrition from originalApiResponse

## Benefits

✅ **Accurate Nutrition**: Per-serving values are now correct  
✅ **Consistency**: All endpoints show the same nutrition values  
✅ **Handles Both Formats**: Recipe format (divide by servings) and ingredient format (already per-amount)  
✅ **Backward Compatible**: Servings parameter is optional, defaults to 1  

## Related Fixes

- **CONSISTENT_NUTRITION_HANDLING_ACROSS_APIS.md**: Trust stored customNutrition
- **OMIT_ON_REPLACE_BUG_FIX.md**: Handle OMIT on existing REPLACE
- **NUTRITION_RECALCULATION_FIX.md**: Avoid unnecessary recalculations

