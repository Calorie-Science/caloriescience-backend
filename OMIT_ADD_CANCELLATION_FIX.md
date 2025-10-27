# OMIT Cancels ADD Fix

## Problem
When you ADD an ingredient (like mango) to a recipe (like apple) and then later OMIT that same ingredient, the nutrition calculation returned **0 for all nutrients** instead of returning to the base recipe nutrition.

### Example Workflow
1. Start: Apple (95 calories)
2. ADD mango: Apple + Mango (219.2 calories) ✅ Works
3. OMIT mango: Should return to Apple (95 calories) ❌ **Returned 0 calories**

## Root Cause

When processing the OMIT operation after a previous ADD:

1. The smart merge logic detected that OMIT "mango" matched a previous ADD "mango"
2. It tried to merge them into a single modification
3. The merged modification had:
   - `originalIngredient: undefined` (from ADD which doesn't have originalIngredient)
   - `type: 'omit'`
4. The nutrition calculation tried to subtract mango from the base apple recipe
5. But mango doesn't exist in the base recipe, so it couldn't find it
6. This caused the calculation to fail and return 0 for all nutrients

## Solution

**File: `api/meal-plans/draft.ts`** (Lines 1236-1248)

Added a special case: When an OMIT is applied to a previous ADD of the same ingredient, **delete both modifications** (they cancel each other out).

```typescript
// SPECIAL CASE: OMIT on previous ADD = complete cancellation (back to base recipe)
if (newMod.type === 'omit' && oldMod.type === 'add') {
  console.log(`  🎯 OMIT on ADD detected - cancelling both modifications (back to base recipe)`);
  debugSmartMerge.deletedDueToNoChange = true;
  debugSmartMerge.operations.push({
    action: 'CANCEL_OUT',
    reason: 'OMIT_CANCELS_ADD',
    ingredient: targetIngredient,
    details: `ADD ${oldMod.newIngredient} then OMIT ${newMod.originalIngredient} = no net change`
  });
  mergedMods.splice(existingModIndex, 1);
  continue; // Skip to next modification
}
```

## How It Works

### Before Fix
```
Modifications: [
  { type: 'add', newIngredient: 'mango', amount: 1, unit: 'piece' }
]
↓ User omits mango
Modifications: [
  { type: 'omit', originalIngredient: undefined, ... } // ❌ Invalid!
]
Result: 0 calories (calculation fails)
```

### After Fix
```
Modifications: [
  { type: 'add', newIngredient: 'mango', amount: 1, unit: 'piece' }
]
↓ User omits mango
Modifications: [] // ✅ Both cancelled out!
Result: 95 calories (base apple nutrition)
```

## Testing

### Test Case 1: ADD then OMIT
```bash
# 1. Start with apple (95 cal)
# 2. ADD mango
curl -X POST .../draft --data '{
  "action": "update-customizations",
  "recipeId": "ingredient_apple",
  "customizations": {
    "modifications": [{
      "type": "add",
      "newIngredient": "mango",
      "amount": 1,
      "unit": "piece"
    }]
  }
}'
# Result: 219.2 calories ✅

# 3. OMIT mango
curl -X POST .../draft --data '{
  "action": "update-customizations",
  "recipeId": "ingredient_apple",
  "customizations": {
    "modifications": [{
      "type": "omit",
      "originalIngredient": "mango",
      "originalAmount": 1,
      "originalUnit": "piece"
    }]
  }
}'
# Result: 95 calories ✅ (back to base!)
```

### Test Case 2: ADD, OMIT, ADD Again
```bash
# 1. ADD mango → 219.2 cal
# 2. OMIT mango → 95 cal (back to base)
# 3. ADD mango again → 219.2 cal
```

Each operation works correctly!

## Edge Cases Handled

| Scenario | Behavior | Result |
|----------|----------|--------|
| ADD mango → OMIT mango | Cancel out | Base nutrition (95 cal) |
| ADD mango → OMIT banana | No cancellation | Invalid (banana not in recipe) |
| ADD mango (1 piece) → OMIT mango (2 pieces) | Cancel out | Base nutrition |
| REPLACE apple (2x) → OMIT apple | Keep replace, apply omit | 0 cal (omit original) |

## Related Issues Fixed

This also fixes related scenarios:
- ✅ Adding and removing ingredients multiple times
- ✅ Adding ingredient A, then B, then removing A
- ✅ Complex modification chains that end up cancelling out

## Files Changed

- `api/meal-plans/draft.ts` - Lines 1236-1248: Added OMIT cancels ADD logic
- `api/recipes/customized.ts` - Lines 915-950: Fixed ingredients array to show modifications (previous fix)

## Impact

After this fix:
- ✅ ADD and OMIT operations work correctly together
- ✅ Users can undo their ingredient additions by omitting them
- ✅ Nutrition always reflects the correct state
- ✅ No more 0-calorie bugs when omitting added ingredients

