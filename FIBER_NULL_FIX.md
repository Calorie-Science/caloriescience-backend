# Fiber and Nutrition NULL Values Fix

## Problem

Recipe 652033 (and potentially other Spoonacular recipes) had NULL fiber values because:

1. **Spoonacular doesn't always provide fiber** in their API response
2. However, they DO provide:
   - `Carbohydrates`: 2.72g
   - `Net Carbohydrates`: 2.53g
   
3. Fiber can be calculated as: **Fiber = Carbohydrates - Net Carbohydrates = 0.19g**

## Root Cause

- Spoonacular API data quality issue - not all recipes include fiber
- Our code was storing NULL instead of 0 when nutrients were missing
- No fallback calculation for fiber when missing

## Solution Implemented

### 1. Database Migration (`066_fix_null_nutrition_values.sql`)

**What it does:**
- Sets all NULL fiber values to 0 across all cached recipes
- Sets all NULL macro values (calories, protein, carbs, fat, etc.) to 0
- For Spoonacular recipes specifically: calculates fiber from `Carbs - Net Carbs` when available
- Updates both column values AND `nutrition_details` JSONB

**To apply:**
```bash
psql $DATABASE_URL -f database/migrations/066_fix_null_nutrition_values.sql
```

**Expected result for recipe 652033:**
- `fiber_per_serving_g`: NULL → 0.19
- `total_fiber_g`: NULL → 1.14 (0.19 × 6 servings)
- `nutrition_details.macros.fiber`: added with calculated value

### 2. Nutrition Mapping Service Update

**File:** `lib/nutritionMappingService.ts`

**Changes:**
- Added fiber fallback calculation in `transformSpoonacularNutrition()`
- When Spoonacular doesn't provide fiber but has Carbs and Net Carbs:
  - Calculate: `fiber = carbs - netCarbs`
  - Log the calculation for debugging
  - Store in standardized format

**Code added:**
```typescript
// Fallback: Calculate fiber from Carbs - Net Carbs if fiber is missing/0
if ((!nutrition.macros.fiber || nutrition.macros.fiber.quantity === 0) && 
    totalCarbs !== null && 
    netCarbs !== null && 
    totalCarbs > netCarbs) {
  const calculatedFiber = Math.round((totalCarbs - netCarbs) * 100) / 100;
  nutrition.macros.fiber = { quantity: calculatedFiber, unit: 'g' };
  console.log(`🔧 Calculated fiber from Carbs (${totalCarbs}g) - Net Carbs (${netCarbs}g) = ${calculatedFiber}g`);
}
```

### 3. Recipe Cache Service Update

**File:** `lib/recipeCacheService.ts`

**Changes:**
- Modified `storeRecipe()` to use nullish coalescing operator (`??`)
- All nutrition fields now default to 0 instead of NULL
- Ensures consistent data in database

**Before:**
```typescript
total_fiber_g: recipe.totalFiberG,
```

**After:**
```typescript
total_fiber_g: recipe.totalFiberG ?? 0,
```

## Testing

### 1. Test the specific recipe:

```bash
# Check before (should show NULL)
psql $DATABASE_URL -c "SELECT external_recipe_id, recipe_name, fiber_per_serving_g FROM cached_recipes WHERE external_recipe_id = '652033';"

# Apply migration
psql $DATABASE_URL -f database/migrations/066_fix_null_nutrition_values.sql

# Check after (should show 0.19)
psql $DATABASE_URL -c "SELECT external_recipe_id, recipe_name, fiber_per_serving_g, nutrition_details->'macros'->'fiber' FROM cached_recipes WHERE external_recipe_id = '652033';"
```

### 2. Or use the test script:

```bash
psql $DATABASE_URL -f test-fiber-fix.sql
```

### 3. Test API response:

```bash
curl -s 'https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=652033&draftId=manual-256e827e-040d-4c19-8540-c9299a7a3ab8-1760597006391&day=1&mealName=snack' \
  -H 'authorization: Bearer YOUR_TOKEN' | jq '.data.fiberPerServingG'
```

**Expected:** `"0.19"` (or calculated value based on carbs)

## Impact

### Positive:
- ✅ Fiber now shows up in customized recipe responses
- ✅ All nutrition fields consistently default to 0 instead of NULL
- ✅ Better data quality for Spoonacular recipes
- ✅ Future recipe caches will have calculated fiber when available

### Breaking Changes:
- None - this is a data quality improvement
- NULL → 0 is backward compatible

## Future Recipes

All newly cached Spoonacular recipes will now:
1. Automatically calculate fiber from Net Carbs if fiber is missing
2. Store 0 instead of NULL for missing nutrients
3. Have consistent nutrition data in both columns and JSONB

## Related Files

- `database/migrations/066_fix_null_nutrition_values.sql` - Migration script
- `lib/nutritionMappingService.ts` - Fiber calculation logic
- `lib/recipeCacheService.ts` - Default to 0 for NULL values
- `test-fiber-fix.sql` - Test queries
- `api/recipes/customized.ts` - Endpoint that returns the data (no changes needed)

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Recipe 652033 now has fiber_per_serving_g = 0.19
- [ ] Recipe 652033 has nutrition_details.macros.fiber.quantity = 0.19
- [ ] API response includes fiberPerServingG field
- [ ] No other recipes were negatively affected
- [ ] Future Spoonacular recipe caches calculate fiber automatically

## Notes

- The fiber value of 0.19g for this recipe is accurate based on Spoonacular's data
- Some recipes may legitimately have 0g fiber (e.g., pure meat dishes)
- The migration is idempotent - safe to run multiple times
- Net Carbs = Total Carbs - Fiber - Sugar Alcohols (but Spoonacular simplifies this)

