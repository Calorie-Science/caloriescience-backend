# Spoonacular Nutrition Zero Values Bug Fix

## Problem Description

Some Spoonacular recipes in the database have **all nutrition values set to 0** in the `nutrition_details` field, even though the nutrition data exists in the `original_api_response` field.

### Root Cause

The issue occurred due to **double-transformation** of nutrition data:

1. Spoonacular API returns nutrition in raw format with a `nutrients` array
2. The code transforms it to standardized format (`macros`, `micros`, `calories`)
3. This transformed data was stored in `original_api_response`
4. When reading from cache, the code tried to transform it **again**
5. Since the data was already transformed (had `macros/micros` instead of `nutrients` array), the transformation function returned all zeros

### Example

**Recipe with problem:**
```json
{
  "recipe_name": "Easy Berry French Toast",
  "nutrition_details": {
    "calories": { "quantity": 0 },
    "macros": { "protein": { "quantity": 0 }, ... }
  },
  "original_api_response": {
    "nutrition": {
      "calories": { "quantity": 544.23 },
      "macros": { "protein": { "quantity": 18.65 }, ... }
    }
  }
}
```

## Solution

### 1. Code Fix (Applied)

Updated the transformation functions to check if data is already in standardized format:

**Files Updated:**
- `lib/nutritionMappingService.ts` - Added check for already-transformed data
- `lib/multiProviderRecipeSearchService.ts` - Added check for already-transformed data

**What Changed:**
```typescript
// Before
if (!spoonacularData || !spoonacularData.nutrients) {
  return nutrition; // Returns all zeros!
}

// After
// Check if data is already in standardized format
if (spoonacularData.macros && spoonacularData.calories) {
  return spoonacularData; // Return as-is if already transformed
}

// Then check for raw format
if (!spoonacularData.nutrients) {
  return nutrition;
}
```

### 2. Database Fix (Migration Script)

For **existing recipes** with zeroed-out nutrition, we created a migration script that:
- Finds all Spoonacular recipes with `has_complete_nutrition = false`
- Extracts nutrition from `original_api_response`
- Updates `nutrition_details` with the correct data
- Sets `has_complete_nutrition = true`

## How to Fix Existing Data

### Run the Migration Script

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the fix script
npm run fix-spoonacular-nutrition
```

**Or directly:**
```bash
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/fix-spoonacular-nutrition.js
```

### Expected Output

```
🔍 Finding Spoonacular recipes with zeroed-out nutrition...

Found 15 recipes to fix

Processing: Easy Berry French Toast (1444543)
  ✅ Nutrition already in standardized format
  ✅ Fixed! Calories: 544.23 kcal

Processing: Overnight Oatmeal (654271)
  ✅ Nutrition already in standardized format
  ✅ Fixed! Calories: 380.11 kcal

...

==================================================
SUMMARY
==================================================
✅ Fixed: 15
❌ Failed: 0
⚠️  Skipped: 0
📊 Total: 15
```

## Verification

After running the fix, verify the results:

```sql
-- Check how many Spoonacular recipes still have incomplete nutrition
SELECT COUNT(*) 
FROM cached_recipes 
WHERE provider = 'spoonacular' 
  AND has_complete_nutrition = false;

-- Should return 0 or only recipes that genuinely don't have nutrition data

-- Check a specific recipe
SELECT 
  recipe_name,
  (nutrition_details->'calories'->>'quantity')::float as calories,
  (nutrition_details->'macros'->'protein'->>'quantity')::float as protein
FROM cached_recipes 
WHERE external_recipe_id = '1444543';

-- Should show actual values, not zeros
```

## Prevention

The code fixes prevent this issue from happening again:

1. ✅ **New recipes** fetched from Spoonacular API will transform correctly
2. ✅ **Cached recipes** will use existing transformed data without re-transforming
3. ✅ **API responses** that extract from cache will get proper nutrition data

## Related Issues

- Recipe nutrition showing as 0 in meal plans
- Nutrition calculations being incorrect for Spoonacular recipes
- `has_complete_nutrition` flag being false despite having data

## Files Changed

1. `lib/nutritionMappingService.ts` - Fixed transformation logic
2. `lib/multiProviderRecipeSearchService.ts` - Fixed transformation logic  
3. `scripts/fix-spoonacular-nutrition.js` - New migration script
4. `package.json` - Added npm script
5. `SPOONACULAR_NUTRITION_FIX.md` - This documentation

## Rollout Checklist

- [x] Update code to handle both data formats
- [x] Create migration script
- [x] Test migration script locally
- [ ] Deploy code changes to production
- [ ] Run migration script on production database
- [ ] Verify fixes with sample queries
- [ ] Monitor for any remaining issues

