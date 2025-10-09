# Nutrition Calculation Improvements

## Overview

Major improvements to nutrition calculation accuracy when modifying ingredient quantities.

---

## Problem

When changing the quantity of the same ingredient (e.g., 1.5 cup rice → 2 cup rice), the previous calculation was:

```
1. Fetch nutrition for "1.5 cup rice" → 500 kcal
2. Fetch nutrition for "2 cup rice" → 700 kcal  
3. Calculate: Original - 500 + 700 = +200 kcal
```

**Issues:**
- API might interpret amounts differently
- Non-linear scaling
- Rounding errors
- Inconsistent results

---

## Solution

### 1. Automatic Original Amount Lookup

**Backend now automatically finds the original ingredient amount** from the recipe - UI doesn't need to send it!

```typescript
// Before nutrition calculation, look up original amounts
for (const mod of modifications) {
  if (mod.type === 'replace' && !mod.originalAmount) {
    // Find from cached recipe ingredients
    const originalIng = cachedRecipe.ingredients.find(...)
    mod.originalAmount = originalIng.amount; // e.g., 1.5
    mod.originalUnit = originalIng.unit;     // e.g., "cup"
  }
}
```

**Locations checked:**
1. ✅ Cached recipe ingredients (most accurate)
2. ✅ API-fetched recipe ingredients
3. ✅ Draft recipe ingredients (fallback)

### 2. Linear Scaling for Quantity Changes

When replacing the **same ingredient** with **different quantity**:

```typescript
// Detects: potato → potato, rice → rice, etc.
if (originalIngredient === newIngredient && oldUnit === newUnit) {
  // Fetch nutrition for 1 unit only
  const baseNutrition = fetch("1 cup rice");
  
  // Calculate delta
  const delta = newAmount - oldAmount; // 2 - 1.5 = 0.5
  
  // Linear scaling
  const deltaNutrition = baseNutrition * delta;
  
  // Apply delta
  result = original + deltaNutrition;
}
```

**Benefits:**
- ✅ **Accurate**: Ensures linear scaling
- ✅ **Consistent**: Same per-unit nutrition value
- ✅ **Efficient**: Only 1 API call instead of 2
- ✅ **Predictable**: Users understand the math

---

## Example: Rice Quantity Change

### Scenario
- **Base recipe**: 1.5 cup rice = 1192 total calories
- **Change**: 1.5 cup → 2 cup rice

### Old Calculation (Inaccurate)
```
1. Fetch "1.5 cup rice" → 450 kcal
2. Fetch "2 cup rice" → 787 kcal  
3. Result: 1192 - 450 + 787 = 1529 kcal (+337 kcal) ❌
   (Not accurate - 0.5 cup should be ~100 kcal, not 337)
```

### New Calculation (Accurate)
```
1. Fetch "1 cup rice" → 200 kcal (base unit)
2. Delta: 2 - 1.5 = 0.5 cup
3. Delta nutrition: 200 × 0.5 = 100 kcal
4. Result: 1192 + 100 = 1292 kcal (+100 kcal) ✅
   (Accurate - 0.5 cup rice ≈ 100 kcal)
```

---

## Smart Modification Merge

### Previous Customizations are Consolidated

When you modify the same ingredient multiple times:

**Scenario**: 2 potatoes → 1 potato → 3 potatoes

**Old behavior (WRONG)**:
```
modifications = [
  { type: 'replace', original: 'potato', originalAmount: 2, amount: 1 },
  { type: 'replace', original: 'potato', originalAmount: 2, amount: 3 }
]
// Would calculate: -2 + 1 - 2 + 3 = 0 ❌ WRONG!
```

**New behavior (CORRECT)**:
```
modifications = [
  { type: 'replace', original: 'potato', originalAmount: 2, amount: 3 }
]
// Calculates: -2 + 3 = +1 potato ✅ CORRECT!
```

**How it works:**
1. ✅ Detects duplicate modifications on same ingredient
2. ✅ **Replaces** old modification instead of appending
3. ✅ **Preserves** originalAmount from first modification
4. ✅ Updates only the final amount
5. ✅ Always calculates from base recipe state

---

## Files Modified

### 1. `api/meal-plans/draft.ts`
- Added original amount lookup BEFORE nutrition calculation
- Added smart merge logic to consolidate duplicate modifications
- Handles all three scenarios: from cache, from API, from draft

### 2. `lib/ingredientCustomizationService.ts`
- Added linear scaling optimization for quantity-only changes
- Detects same ingredient + same unit
- Falls back to full fetch for different ingredients
- Applied to both Edamam and Spoonacular sections

### 3. `api/meal-plans/drafts/[id].ts`
- Fixed nutrition extraction from cache vs draft
- Auto-updates cache when 0 values detected
- Searches in allRecipes for selected recipes (pagination-aware)

---

## Usage

### UI No Longer Needs to Send originalAmount!

**Before:**
```json
{
  "type": "replace",
  "originalIngredient": "rice",
  "newIngredient": "rice",
  "originalAmount": 1.5,
  "originalUnit": "cup",
  "amount": 2,
  "unit": "cup"
}
```

**After:**
```json
{
  "type": "replace",
  "originalIngredient": "rice",
  "newIngredient": "rice",
  "amount": 2,
  "unit": "cup"
}
```

Backend automatically finds:
- `originalAmount: 1.5` (from cached recipe)
- `originalUnit: "cup"` (from cached recipe)

---

## Testing

### Test Case 1: Quantity Change (Same Ingredient)
```bash
# Change 1.5 cup rice to 2 cup rice
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_123",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "recipe_abc",
    "customizations": {
      "recipeId": "recipe_abc",
      "source": "edamam",
      "modifications": [{
        "type": "replace",
        "originalIngredient": "rice",
        "newIngredient": "rice",
        "amount": 2,
        "unit": "cup"
      }]
    }
  }'
```

**Expected:**
- ✅ Automatically finds `originalAmount: 1.5` from recipe
- ✅ Uses linear scaling: delta = 0.5 cup
- ✅ Accurate calorie change: ~100 kcal (not 337)

### Test Case 2: Multiple Edits
```bash
# First: 2 → 1 potato
# Then: 1 → 3 potatoes
# Result should be: 2 → 3 (NOT 2→1, then 1→3)
```

**Expected:**
- ✅ Consolidates to single modification: 2 → 3
- ✅ Net change: +1 potato worth of nutrition

---

## Benefits

- ✅ **Accuracy**: Linear scaling ensures predictable nutrition changes
- ✅ **Simplicity**: UI doesn't need to track/send original amounts
- ✅ **Performance**: 1 API call instead of 2 for quantity changes
- ✅ **Reliability**: Handles multiple edits correctly
- ✅ **Micronutrients**: Linear scaling applies to vitamins/minerals too

---

## Edge Cases Handled

1. ✅ **Ingredient not found**: Falls back to new amount
2. ✅ **Different units**: Uses full fetch (no linear scaling)
3. ✅ **Different ingredients**: Uses full fetch
4. ✅ **Multiple edits**: Consolidates into single modification
5. ✅ **Cache miss**: Falls back to API fetch then draft
6. ✅ **Negative delta**: Correctly subtracts (reducing quantity)

---

## Console Logs to Watch For

When testing, you'll see:
```
🔍 Looking up original amount for: rice (replace)
  ✅ Found original: 1.5 cup rice
📊 Same ingredient quantity change detected: 1.5 → 2 cup rice
  📝 Fetching nutrition for base unit: "1 cup rice" (Spoonacular)
  📐 Amount delta: 1.5 → 2 = 0.5 cup
  📊 Base nutrition (per cup): 206 kcal
  📊 Delta nutrition (0.5 cup): 103 kcal
  ✅ Applied quantity change using linear scaling
     Result: 1295 kcal
```

This shows the optimization is working correctly!

---

## Next Steps

After deployment:
1. Test quantity changes with the same ingredient
2. Verify nutrition changes are accurate
3. Check console logs for "linear scaling" messages
4. Test multiple edits to same ingredient
5. Verify micronutrients scale correctly too

