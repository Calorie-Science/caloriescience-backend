# Simple Ingredient Customization Bug Fix

## Problem
When trying to add, edit, or delete ingredients in recipes fetched from `simpleIngredientService.ts` (e.g., `ingredient_carrot`), the system would fail because:

1. The `handleUpdateCustomizations` function in `api/meal-plans/draft.ts` tried to fetch recipe details from external APIs (Spoonacular/Edamam)
2. Simple ingredients have IDs like `ingredient_carrot` which don't exist in external APIs
3. This caused API fetch failures and prevented ingredient customization

## Root Cause
Simple ingredients are generated locally by `simpleIngredientService.ts` with IDs prefixed with `ingredient_`. These are NOT external recipe IDs and cannot be fetched from Spoonacular or Edamam APIs.

## Solution

### 1. Updated `api/meal-plans/draft.ts` - `handleUpdateCustomizations` function

**Added detection for simple ingredients:**
```typescript
// Check if this is a simple ingredient (from simpleIngredientService)
const isSimpleIngredient = (recipe as any).isSimpleIngredient === true || 
                            (recipe as any).isIngredient === true || 
                            recipeId.startsWith('ingredient_');
```

**Skip external API fetch for simple ingredients:**
- When a simple ingredient is detected, the system now uses the recipe data directly from the draft
- No cache or API lookup is attempted
- Nutrition information is extracted from the recipe object itself
- Original ingredient amounts are looked up from the recipe's ingredients array

**Key changes:**
- Line 1333-1419: Added conditional logic to handle simple ingredients separately
- Simple ingredients use nutrition data directly from the recipe object
- Servings default to 1 for simple ingredients
- Original amounts are looked up from the recipe's ingredients array

### 2. Updated `lib/multiProviderRecipeSearchService.ts` - `getRecipeDetails` method

**Added guard clause for simple ingredient IDs:**
```typescript
// Check if this is a simple ingredient (from simpleIngredientService)
// These are locally generated and should not be fetched from external APIs
if (recipeId.startsWith('ingredient_')) {
  console.log(`⚠️ Attempted to fetch simple ingredient ${recipeId} from external API - returning null`);
  return null;
}
```

**Benefits:**
- Prevents unnecessary API calls for simple ingredients
- Returns null gracefully instead of throwing errors
- Other code paths that call this method will handle the null return properly

## Testing

### Test Case: Update Carrot Quantity
The provided curl command should now work correctly:

```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -H 'content-type: application/json' \
  --data-raw '{
    "action":"update-customizations",
    "draftId":"manual-03b05e9b-c3d9-4237-ba0a-d4539f5ad552-1761546831572",
    "day":1,
    "mealName":"snack",
    "recipeId":"ingredient_carrot",
    "customizations":{
      "recipeId":"ingredient_carrot",
      "source":"spoonacular",
      "modifications":[{
        "type":"replace",
        "originalIngredient":"carrot",
        "originalIngredientName":"carrot",
        "originalAmount":1,
        "originalUnit":"medium",
        "newIngredient":"carrot",
        "amount":10,
        "unit":"gram",
        "notes":"Updated from 1 medium carrot"
      }]
    }
  }'
```

### Expected Behavior
1. ✅ System detects `ingredient_carrot` as a simple ingredient
2. ✅ Skips external API fetch
3. ✅ Uses nutrition data from the recipe object
4. ✅ Calculates new nutrition based on the modification (1 medium carrot → 10g carrot)
5. ✅ Returns updated nutrition and customization details

## Related Files Changed
- `api/meal-plans/draft.ts` - Added simple ingredient detection and handling
- `lib/multiProviderRecipeSearchService.ts` - Added guard clause for simple ingredient IDs

## Files Already Handling Simple Ingredients Correctly
- `api/recipes/customized.ts` - Already has logic to detect and handle simple ingredients (lines 110-116)

## Additional Notes

### Simple Ingredient Properties
Simple ingredients from `simpleIngredientService.ts` have these identifying properties:
- `id` starts with `ingredient_`
- `isSimpleIngredient: true`
- `isIngredient: true`
- `source: 'spoonacular'` (for compatibility)

### Nutrition Format
Simple ingredients already contain complete nutrition information in the correct format:
- Flat values: `calories`, `protein`, `carbs`, `fat`, `fiber`
- Nested object: `nutrition.calories`, `nutrition.macros.*`, `nutrition.micros.*`

Both formats are now supported by the fix.

## Deployment
After deploying these changes, all operations on simple ingredients will work correctly:
- ✅ Replace ingredient (change quantity/unit)
- ✅ Omit ingredient (remove completely)
- ✅ Add ingredient (not applicable for simple ingredients, but supported)

## Future Improvements
Consider adding:
1. Better TypeScript types for simple ingredients to avoid `as any` casts
2. Unit tests for simple ingredient customization
3. Integration tests with the simple ingredient service

