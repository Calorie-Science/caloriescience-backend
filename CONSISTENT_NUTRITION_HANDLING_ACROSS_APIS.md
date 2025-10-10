# Consistent Nutrition Handling Across All Draft APIs

## Summary
Ensured all three draft-related APIs use the **same nutrition handling strategy** to prevent inconsistent calorie/nutrition data across different endpoints.

## The Three APIs

### 1. `/api/recipes/customized` (GET)
**Purpose**: Fetch a single customized recipe with applied modifications  
**Usage**: When viewing details of a specific customized recipe  
**Status**: ✅ Already correct

### 2. `/api/meal-plans/draft` (POST with `action: "get-draft"`)
**Purpose**: Fetch full draft with all recipes and suggestions  
**Usage**: Main draft editing view with recipe selection  
**Status**: ✅ Fixed (lines 361-545)

### 3. `/api/meal-plans/drafts/[id]` (GET)
**Purpose**: Fetch draft nutrition summary (selected recipes only)  
**Usage**: Dashboard view showing daily/weekly nutrition totals  
**Status**: ✅ Fixed (lines 132-185)

## The Unified Nutrition Strategy

All three APIs now follow this **consistent approach**:

```typescript
// 1. Check if we have valid stored customNutrition
const hasValidCustomNutrition = customizations?.customNutrition && 
                                 customizations.customNutrition.calories &&
                                 (customizations.customNutrition.calories.quantity > 0 || 
                                  customizations.customNutrition.calories > 0);

// 2. If customNutrition has micronutrients, TRUST IT (already calculated correctly)
if (hasValidCustomNutrition && customizations.customNutrition.micros) {
  // Use stored customNutrition with micronutrients
  finalNutrition = customizations.customNutrition;
  finalMicronutrients = customizations.customNutrition.micros;
}
// 3. If old format (no micros), use it but supplement with cache micros
else if (hasValidCustomNutrition) {
  // Use macros from customNutrition
  // Get micros from cached base recipe if available
}
// 4. If no customNutrition, use base nutrition from cache/API
else {
  // Use base recipe nutrition
}
```

## Why This Matters

### Before the Fix:
- ❌ `/api/recipes/customized`: 941.76 kcal ✅
- ❌ `/api/meal-plans/draft`: 815.92 kcal (WRONG - was recalculating incorrectly)
- ❌ `/api/meal-plans/drafts/[id]`: Potentially different values

### After the Fix:
- ✅ `/api/recipes/customized`: 941.76 kcal
- ✅ `/api/meal-plans/draft`: 941.76 kcal (now trusts stored customNutrition)
- ✅ `/api/meal-plans/drafts/[id]`: 941.76 kcal (uses same logic)

## Key Principles

1. **Trust Stored CustomNutrition with Micros**
   - If `customNutrition` has `micros` (vitamins/minerals), it was calculated by `IngredientCustomizationService`
   - This service properly handles all modification types (replace, omit, add)
   - No need to recalculate - the stored value is accurate

2. **Only Recalculate When Necessary**
   - Recalculation should only happen in `update-customizations` handler
   - GET endpoints should trust the already-calculated values
   - Prevents inconsistencies from deduplication issues

3. **Handle Both Old and New Formats**
   - Old format: `{ calories: 123, protein: 45, ... }` (no micros)
   - New format: `{ calories: {quantity: 123, unit: 'kcal'}, macros: {...}, micros: {...} }`
   - Both formats are supported for backward compatibility

## Testing

### Test Case 1: Basic Customization
```bash
# 1. Modify eggs: 2 → 5
curl -X POST .../api/meal-plans/draft \
  --data '{"action":"update-customizations", ...modifications: [{type: "replace", originalIngredient: "eggs", amount: 5}]}'

# Expected: customNutrition calculated and stored with micros

# 2. Fetch draft
curl -X POST .../api/meal-plans/draft --data '{"action":"get-draft", "draftId":"..."}'

# Expected: Same calories as step 1

# 3. Fetch summary
curl .../api/meal-plans/drafts/[id]

# Expected: Same calories as step 1 & 2
```

### Test Case 2: OMIT After REPLACE
```bash
# 1. User changes eggs: 2 → 5 (REPLACE)
# 2. User deletes eggs (OMIT)

# All three APIs should show:
# - Eggs completely removed
# - Calories reduced by original 2 eggs
# - customNutrition shows OMIT, not REPLACE
```

## Files Modified

1. **`api/meal-plans/draft.ts`**
   - Lines 361-545: Updated `handleGetDraft` to trust stored customNutrition with micros
   - Lines 1119-1133: Added OMIT vs REPLACE matching case in smart merge

2. **`api/meal-plans/drafts/[id].ts`**
   - Lines 132-185: Updated nutrition handling to match draft.ts logic
   - Now trusts stored customNutrition with micros

3. **`api/recipes/customized.ts`**
   - No changes needed - already had correct logic

## Benefits

✅ **Consistency**: All APIs return the same nutrition values  
✅ **Accuracy**: Stored customNutrition with micros is trusted (calculated correctly)  
✅ **Performance**: No unnecessary recalculations on GET endpoints  
✅ **Maintainability**: Single source of truth for nutrition handling strategy  

## Related Fixes

- **NUTRITION_RECALCULATION_FIX.md**: Trust stored customNutrition instead of recalculating
- **OMIT_ON_REPLACE_BUG_FIX.md**: Handle OMIT on existing REPLACE modifications
- **Duplicate modifications bug**: Smart merge properly replaces old modifications

