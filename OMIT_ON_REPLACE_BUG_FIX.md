# OMIT on Existing REPLACE Bug Fix

## Issue
When trying to OMIT/delete an ingredient that had a previous REPLACE modification, the system was ignoring the OMIT request and keeping the old REPLACE modification.

### Example
1. Base recipe: 2 eggs
2. User modifies: 2 eggs → 5 eggs (REPLACE)
3. User tries to delete eggs (OMIT)
4. **BUG**: System kept showing 3 eggs (old REPLACE was not replaced)

## Root Cause
The smart merge logic in `api/meal-plans/draft.ts` was missing a matching case for:
- **New**: OMIT eggs
- **Existing**: REPLACE eggs

The matching logic only handled:
- REPLACE vs REPLACE ✅
- OMIT vs OMIT ✅
- ADD vs ADD ✅
- REPLACE/OMIT on previous ADD ✅
- **OMIT on existing REPLACE ❌ (MISSING)**

## Fix
Added a new matching case in the `handleUpdateCustomizations` function (lines 1119-1133):

```typescript
// NEW: OMIT on existing REPLACE (user wants to delete an ingredient they previously modified)
if (newMod.type === 'omit' && existing.type === 'replace' && newMod.originalIngredient && existing.originalIngredient) {
  const newOmitTarget = newMod.originalIngredient.toLowerCase().trim();
  const existingReplaceOriginal = existing.originalIngredient.toLowerCase().trim();
  const existingReplaceResult = existing.newIngredient.toLowerCase().trim();
  
  // Match if OMIT targets either the original ingredient OR the result of the REPLACE
  // Example: eggs→eggs (replace 2→3), then omit eggs should match
  const matchesOriginal = newOmitTarget === existingReplaceOriginal;
  const matchesResult = newOmitTarget === existingReplaceResult;
  const match = matchesOriginal || matchesResult;
  
  console.log(`      OMIT vs REPLACE match: ${match} (omit "${newOmitTarget}" vs replace "${existingReplaceOriginal}"→"${existingReplaceResult}")`);
  return match;
}
```

## How It Works Now
1. User has REPLACE modification: eggs 2→5
2. User sends OMIT eggs request
3. System **matches** OMIT with existing REPLACE
4. System **replaces** REPLACE with OMIT
5. System **preserves** originalAmount (2) and originalUnit from base recipe
6. Nutrition calculation correctly removes 2 eggs (original base amount)
7. Result: Eggs are completely removed from the recipe ✅

## Testing
Deploy and test with:
```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -H 'content-type: application/json' \
  --data-raw '{
    "action":"update-customizations",
    "draftId":"YOUR_DRAFT_ID",
    "day":1,
    "mealName":"breakfast",
    "recipeId":"639769",
    "customizations":{
      "recipeId":"639769",
      "source":"spoonacular",
      "modifications":[{
        "type":"omit",
        "originalIngredient":"eggs",
        "notes":"Removed manually"
      }]
    }
  }'
```

Expected result:
- Eggs should be completely removed from ingredients list
- Calories should decrease by the amount from the original 2 eggs
- The stored modification should show `type: "omit"`, not `type: "replace"`

## Files Modified
- `api/meal-plans/draft.ts` - Added OMIT vs REPLACE matching case

## Related Fixes
This builds on the previous fix for:
- Duplicate modifications bug (NUTRITION_RECALCULATION_FIX.md)
- Smart merge logic improvements for quantity changes

