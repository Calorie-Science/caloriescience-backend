# Simple Ingredient in Manual Meal Plans - Fix

## Problem
When trying to add simple ingredients to manual meal plans, the request was failing because:
1. Simple ingredients now use database UUIDs instead of `ingredient_` prefixed names
2. The service was checking if recipe ID starts with `ingredient_` to detect simple ingredients
3. UUID-based IDs don't start with `ingredient_`, causing them to be treated as regular recipes from Spoonacular

## Solution
Added an `isSimpleIngredient` boolean flag to indicate when a recipe is actually a simple ingredient.

## Changes Made

### 1. Ingredients Search API Response Update
**File**: `lib/simpleIngredientService.ts`

Added `isSimpleIngredient: true` flag to all ingredient search responses:

```typescript
// Ingredients search API now returns:
{
  id: "418f80db-4dd1-439f-8f15-2cdbcf7a3f99",  // UUID
  name: "broccoli",
  title: "Broccoli",
  category: "vegetable",
  // ... nutrition fields
  isSimpleIngredient: true  // ✅ NEW FLAG
}
```

### 2. API Schema Update
**File**: `api/meal-plans/manual/add-recipe.ts`

```typescript
// Added optional isSimpleIngredient field
const addRecipeSchema = Joi.object({
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipe: Joi.object({
    id: Joi.string().required(),
    provider: Joi.string().valid('edamam', 'spoonacular', 'bonhappetee', 'manual').required(),
    source: Joi.string().valid('api', 'cached').required(),
    isSimpleIngredient: Joi.boolean().optional()  // ✅ NEW
  }).required(),
  servings: Joi.number().min(0.1).max(20).optional()
});
```

### 2. Service Interface Update
**File**: `lib/manualMealPlanService.ts`

```typescript
export interface AddRecipeParams {
  draftId: string;
  day: number;
  mealName: string;
  recipeId: string;
  provider: 'edamam' | 'spoonacular' | 'bonhappetee' | 'manual';
  source: 'api' | 'cached';
  servings?: number;
  isSimpleIngredient?: boolean;  // ✅ NEW
}
```

### 3. Detection Logic Update
**File**: `lib/manualMealPlanService.ts`

```typescript
// BEFORE ❌
const isSimpleIngredient = params.recipeId.startsWith('ingredient_');

// AFTER ✅
const isSimpleIngredient = params.isSimpleIngredient === true;
```

### 4. Ingredient Fetching Update
**File**: `lib/manualMealPlanService.ts`

Updated `getIngredientRecipe()` to fetch by UUID from database:

```typescript
// BEFORE ❌ - Extracted name from ID and searched
const ingredientName = ingredientId.replace(/^ingredient_/, '').replace(/_/g, ' ');
const results = await simpleIngredientService.searchIngredientsAsRecipes(ingredientName, 1);

// AFTER ✅ - Fetch directly by UUID
const { data: ingredient, error } = await supabase
  .from('simple_ingredients')
  .select('*')
  .eq('id', ingredientId)
  .eq('is_active', true)
  .single();
```

## Correct Request Format

### Adding a Simple Ingredient

```bash
POST /api/meal-plans/manual/add-recipe
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "draftId": "manual-5615a4b3-9a42-4b89-9083-a81ce260dec1-1761727922007",
  "day": 1,
  "mealName": "breakfast",
  "recipe": {
    "id": "418f80db-4dd1-439f-8f15-2cdbcf7a3f99",  // UUID from simple_ingredients table
    "provider": "spoonacular",                       // Keep existing provider
    "source": "api",                                 // Keep existing source
    "isSimpleIngredient": true                       // ✅ NEW FLAG - Set to true for ingredients
  },
  "servings": 1
}
```

### Adding a Regular Recipe (No Change)

```bash
POST /api/meal-plans/manual/add-recipe
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "draftId": "manual-5615a4b3-9a42-4b89-9083-a81ce260dec1-1761727922007",
  "day": 1,
  "mealName": "lunch",
  "recipe": {
    "id": "652033",                      // Spoonacular recipe ID
    "provider": "spoonacular",
    "source": "api"
    // No isSimpleIngredient flag needed
  },
  "servings": 2
}
```

## Frontend Integration

### When Adding Simple Ingredient from Search Results

```typescript
// After getting ingredient from /api/ingredients/search
const ingredient = {
  id: "418f80db-4dd1-439f-8f15-2cdbcf7a3f99",
  name: "broccoli",
  isSimpleIngredient: true,     // ✅ This flag is now returned by the API
  // ... other fields
};

// Add to meal plan - just pass the flag through
await addRecipeToMealPlan({
  draftId: mealPlanDraftId,
  day: 1,
  mealName: "breakfast",
  recipe: {
    id: ingredient.id,                        // UUID from database
    provider: "spoonacular",                  // Keep consistent
    source: "api",
    isSimpleIngredient: ingredient.isSimpleIngredient  // ✅ Pass through from API response
  },
  servings: 1
});
```

### When Adding Regular Recipe

```typescript
// After getting recipe from /api/recipe-search
const recipe = {
  id: "652033",
  title: "Chicken Salad",
  // ... other fields
};

// Add to meal plan
await addRecipeToMealPlan({
  draftId: mealPlanDraftId,
  day: 1,
  mealName: "lunch",
  recipe: {
    id: recipe.id,
    provider: "spoonacular",
    source: "api"
    // No isSimpleIngredient flag
  },
  servings: 2
});
```

## Benefits

1. **Backward Compatible**: Existing code continues to work
2. **Clear Intent**: Explicit flag makes it clear when dealing with simple ingredients
3. **No Breaking Changes**: Provider field remains consistent
4. **UUID Support**: Properly handles database UUIDs for simple ingredients
5. **Flexible**: Can easily add more flags in the future if needed

## Testing

### Test Adding Simple Ingredient

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "418f80db-4dd1-439f-8f15-2cdbcf7a3f99",
      "provider": "spoonacular",
      "source": "api",
      "isSimpleIngredient": true
    },
    "servings": 1
  }'
```

**Expected**: ✅ Successfully adds the ingredient to the meal plan

### Test Without Flag (Regular Recipe Behavior)

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-xxx",
    "day": 1,
    "mealName": "lunch",
    "recipe": {
      "id": "652033",
      "provider": "spoonacular",
      "source": "api"
    },
    "servings": 2
  }'
```

**Expected**: ✅ Successfully adds the Spoonacular recipe to the meal plan

## Files Modified

1. `lib/simpleIngredientService.ts` - Added isSimpleIngredient flag to API responses
2. `api/meal-plans/manual/add-recipe.ts` - Added isSimpleIngredient to schema
3. `lib/manualMealPlanService.ts` - Updated interfaces and detection logic

---

**Date**: October 29, 2025  
**Status**: ✅ Complete  
**Testing**: Ready for testing

