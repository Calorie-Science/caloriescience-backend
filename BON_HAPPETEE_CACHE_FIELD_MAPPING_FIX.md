# Bon Happetee Cache Field Mapping Fix

## The Real Issue

Bon Happetee ingredients were showing as 0 with empty units, but the **API was returning correct data** and the **database was storing correct data**. The problem was a **field name mismatch** between what's stored in the cache and what the code expects.

### What Was Happening

1. **API Returns** (correct):
   ```json
   {
     "ingredient_name": "chickpeas",
     "basic_unit_measure": 28,
     "proportion": 0.15
   }
   ```

2. **Cached in Database** (correct):
   ```json
   {
     "food": "chickpeas",
     "quantity": 28,
     "measure": "g",
     "category": "legumes",
     "proportion": 0.15
   }
   ```

3. **Code Expected** (missing fields):
   ```json
   {
     "name": "chickpeas",
     "amount": 0,     // ❌ Field doesn't exist in cache!
     "unit": ""       // ❌ Field doesn't exist in cache!
   }
   ```

4. **User Saw**:
   ```json
   {
     "name": "chickpeas",
     "amount": 0,     // ❌ Defaulted to 0
     "unit": ""       // ❌ Defaulted to empty
   }
   ```

## Root Cause

The code had two different field naming conventions:

### When Caching (writes to DB):
- Stores as: `quantity`, `measure`

### When Reading from Cache:
- Expects: `amount`, `unit`
- Falls back to 0 and "" when fields don't exist

This mismatch caused ingredients to appear empty even though they were stored correctly!

## The Fix

Added field transformation in `getRecipeFromCache()` to map cached field names to expected field names:

**File:** `lib/manualMealPlanService.ts` (Lines 898-907)

```typescript
// Transform cached ingredients to expected format
// Database stores: quantity/measure, but code expects: amount/unit
if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
  recipe.ingredients = recipe.ingredients.map((ing: any) => ({
    ...ing,
    // Add 'amount' and 'unit' fields if they don't exist (backwards compatibility)
    amount: ing.amount !== undefined ? ing.amount : ing.quantity,
    unit: ing.unit !== undefined ? ing.unit : ing.measure
  }));
}
```

This ensures that:
- If `amount` exists, use it (new format)
- Otherwise, use `quantity` (cached format)
- If `unit` exists, use it (new format)
- Otherwise, use `measure` (cached format)

## Why This Happened

1. **Initial Implementation**: Code stored ingredients with `quantity`/`measure`
2. **Search Results**: Expected `amount`/`unit` for display
3. **Missing Transformation**: No mapping between cached format and display format
4. **Silent Failure**: Code just defaulted to 0 and "" when fields missing

## Verification

### Test with Cached Recipe

```bash
# Search for Bon Happetee recipe (will use cache if available)
curl -X POST "http://localhost:3000/api/recipes/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid",
    "query": "palak pakora",
    "providers": ["bonhappetee"]
  }' | jq '.data.bonhappetee.recipes[0].ingredients[0:3]'
```

**Expected Output:**
```json
[
  {
    "name": "spices, chili powder",
    "food": "spices, chili powder",
    "amount": 0.0675,        // ✅ Has value!
    "unit": "g",             // ✅ Has unit!
    "quantity": 0.0675,
    "measure": "g",
    "category": "dry herbs and spices",
    "proportion": 0.00324
  },
  {
    "name": "oil, rice bran",
    "food": "oil, rice bran",
    "amount": 2.04,
    "unit": "g",
    "category": "vegetable oils",
    "proportion": 0.0979
  }
]
```

### Add to Manual Meal Plan

```bash
# Add cached recipe to meal plan
curl -X POST "http://localhost:3000/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "draft-id",
    "day": 1,
    "mealName": "lunch",
    "recipe": {
      "id": "c15916ce-272f-4aeb-af6c-66118bf2eb69",
      "provider": "bonhappetee",
      "source": "cached"
    }
  }' | jq '.data.suggestions[0].meals.lunch.recipes[0].ingredients[0:3]'
```

**Expected:** Ingredients with actual amounts and units.

## Database Schema

The cache stores ingredients as JSONB with both naming conventions now supported:

```sql
-- cached_recipes.ingredients (JSONB)
[
  {
    "food": "ingredient name",
    "text": "ingredient name", 
    "quantity": 28.5,          -- Original cached field
    "measure": "g",            -- Original cached field
    "amount": 28.5,            -- Transformed field (added on read)
    "unit": "g",               -- Transformed field (added on read)
    "category": "legumes",
    "proportion": 0.15,
    "weight": 28.5
  }
]
```

## Impact

### Before Fix
- ❌ Cached Bon Happetee recipes showed 0 for all amounts
- ❌ All units were empty strings
- ❌ Made it look like no ingredient data was available
- ❌ Poor user experience for Indian recipes

### After Fix
- ✅ Cached recipes now show actual ingredient amounts
- ✅ Units properly displayed as "g"
- ✅ No need to re-fetch from API
- ✅ Works for both new and cached recipes
- ✅ Backwards compatible with existing cache

## Other Providers

This issue was **specific to Bon Happetee** because:
- Edamam and Spoonacular use consistent field names
- Bon Happetee had different conventions for caching vs display
- The fix ensures consistency across all code paths

## Related Files

- `lib/manualMealPlanService.ts` - Fixed `getRecipeFromCache()` method
- `lib/multiProviderRecipeSearchService.ts` - Correct field mapping for API responses
- Database: `cached_recipes.ingredients` - Stores both naming conventions

## Future Improvements

1. **Standardize Field Names**: Choose one naming convention everywhere
   - Option A: Always use `quantity`/`measure`
   - Option B: Always use `amount`/`unit`

2. **Type Safety**: Create TypeScript interfaces for ingredient format

3. **Migration**: Consider updating existing cache entries to use consistent naming

4. **Documentation**: Document expected ingredient format in code comments

## Summary

The issue wasn't with the API or caching logic—it was a **simple field name mismatch**:
- Database: `quantity` → Code expected: `amount`
- Database: `measure` → Code expected: `unit`

Adding a simple transformation when reading from cache fixed the issue for all cached Bon Happetee recipes! 🎉

---

**Fixed:** October 28, 2025  
**Status:** ✅ Completed and tested  
**Affects:** Only cached Bon Happetee recipes  
**Breaking Changes:** None (backwards compatible)

