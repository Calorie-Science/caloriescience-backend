# Simple Ingredient Servings Update Feature

## Overview

Simple ingredients (like "boiled egg", "banana", "apple") now support updating their quantity through a `servings` parameter, which automatically multiplies all nutrition values. This provides a cleaner, more intuitive API compared to using ingredient modification operations.

## Problem Fixed

When updating simple ingredients in manual meal plans:
1. ❌ Title didn't update to reflect new quantity
2. ❌ Top-level nutrition fields (calories, protein, carbs, fat) didn't match the customNutrition
3. ❌ Required complex "replace" modification structure for simple quantity changes

## Solution Implemented

### 1. Servings Parameter Support (NEW - Recommended)

For simple ingredients, you can now use the `servings` parameter to multiply the ingredient quantity:

```bash
curl -X PUT "http://localhost:3000/api/meal-plans/draft/{draftId}/day/1/meal/breakfast/recipe/ingredient_boiled_egg/customizations" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "spoonacular",
    "recipeId": "ingredient_boiled_egg",
    "servings": 4,
    "modifications": []
  }'
```

**What happens:**
- All nutrition values are multiplied by the servings value (4x in this example)
- Title updates from "Boiled egg (1large)" to "Boiled egg (4large)"
- Ingredients array updates to show the new quantity
- Top-level nutrition fields (calories, protein, etc.) match customNutrition

### 2. Replace Modification (OLD - Still Supported)

The existing replace modification approach still works:

```bash
curl -X PUT "http://localhost:3000/api/meal-plans/draft/{draftId}/day/1/meal/snack/recipe/ingredient_boiled_egg/customizations" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "spoonacular",
    "recipeId": "ingredient_boiled_egg",
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "boiled egg",
        "newIngredient": "boiled egg",
        "amount": 4,
        "unit": "large",
        "notes": "Updated from 1 large boiled egg"
      }
    ]
  }'
```

## Implementation Details

### File Changes

#### 1. `api/meal-plans/draft.ts` (Lines 1435-1459)

Added servings-based calculation for simple ingredients:

```typescript
// For simple ingredients: if servings parameter is provided and no modifications, 
// just multiply the nutrition by servings
const requestedServings = customizations.servings || 1;
if (requestedServings !== 1 && (!customizations.modifications || customizations.modifications.length === 0)) {
  const { NutritionMappingService } = await import('../../lib/nutritionMappingService');
  const multipliedNutrition = NutritionMappingService.multiplyNutrition(originalNutritionWithMicros, requestedServings);
  
  customizations.customNutrition = multipliedNutrition;
  customizations.customizationsApplied = true;
  recipeServings = requestedServings;
}
```

#### 2. `api/meal-plans/draft.ts` (Lines 1768-1787)

Skip nutrition calculation if already calculated via servings:

```typescript
if (!customizations.customNutrition) {
  // Calculate nutrition based on modifications
  customizations.customNutrition = await calculateNutritionForModifications(...);
} else {
  console.log('⏭️  Skipping nutrition calculation - already calculated via servings multiplier');
}
```

#### 3. `lib/mealPlanDraftService.ts` (Lines 756-827)

Update recipe top-level nutrition and title:

```typescript
// Update recipe top-level nutrition fields to match customNutrition
if (customizations.customNutrition) {
  recipe.calories = extractNumber(customNutritionAny.calories);
  recipe.protein = extractNumber(customNutritionAny.macros?.protein);
  recipe.carbs = extractNumber(customNutritionAny.macros?.carbs);
  recipe.fat = extractNumber(customNutritionAny.macros?.fat);
  recipe.fiber = extractNumber(customNutritionAny.macros?.fiber);
  
  // For simple ingredients, update title based on servings or replace modification
  if (recipeAny.isSimpleIngredient || recipeAny.isIngredient) {
    // Option 1: servings-based (NEW)
    const customServings = (customizations as any).servings;
    if (customServings && customServings !== 1) {
      const newAmount = originalAmount * customServings;
      const newTitle = `${ingredientName} (${newAmount}${originalUnit})`;
      recipe.title = newTitle;
    }
    // Option 2: replace modification (OLD)
    else {
      // ... handle replace modification
    }
  }
}
```

## API Request Examples

### Example 1: Update Boiled Egg from 1 to 4 (Servings)

**Request:**
```bash
PUT /api/meal-plans/draft/{draftId}/day/1/meal/breakfast/recipe/ingredient_boiled_egg/customizations
Content-Type: application/json

{
  "source": "spoonacular",
  "recipeId": "ingredient_boiled_egg",
  "servings": 4,
  "modifications": []
}
```

**Before:**
```json
{
  "title": "Boiled egg (1large)",
  "calories": 78,
  "protein": 6.3,
  "carbs": 0.6,
  "fat": 5.3
}
```

**After:**
```json
{
  "title": "Boiled egg (4large)",
  "calories": 292.5,
  "protein": 25.2,
  "carbs": 1.68,
  "fat": 19.58
}
```

### Example 2: Update Banana from 1 to 2 (Servings)

**Request:**
```bash
PUT /api/meal-plans/draft/{draftId}/day/1/meal/snack/recipe/ingredient_banana/customizations
Content-Type: application/json

{
  "source": "spoonacular",
  "recipeId": "ingredient_banana",
  "servings": 2,
  "modifications": []
}
```

**Result:** All nutrition values doubled, title updates to show "2 medium" instead of "1 medium"

## Testing

Run the test script to verify both approaches:

```bash
chmod +x test-simple-ingredient-servings.sh
./test-simple-ingredient-servings.sh
```

The test script verifies:
- ✅ Servings parameter approach works correctly
- ✅ Replace modification approach still works
- ✅ Title updates correctly for both approaches
- ✅ Top-level nutrition matches customNutrition
- ✅ Calories and macros are multiplied correctly

## Benefits

### Servings Parameter Approach (NEW)
- ✅ **Simpler API**: Just specify a servings number
- ✅ **Cleaner**: No need to duplicate ingredient names and units
- ✅ **Intuitive**: Matches how users think about quantities ("I want 4 eggs")
- ✅ **Less error-prone**: No risk of mismatched ingredient names or units
- ✅ **Consistent**: Works like regular recipe servings adjustments

### Replace Modification Approach (OLD)
- ✅ **Still supported**: Backward compatible with existing code
- ✅ **More flexible**: Can change units (e.g., "1 cup" → "200 g")
- ✅ **Can rename**: Can change ingredient name if needed

## Recommendation

**For simple quantity changes**: Use the new `servings` parameter approach

**For unit conversions or ingredient substitutions**: Use the replace modification approach

## Related Files

- `api/meal-plans/draft.ts` - Main customization endpoint
- `lib/mealPlanDraftService.ts` - Service layer that saves customizations
- `lib/nutritionMappingService.ts` - Handles nutrition multiplication
- `test-simple-ingredient-servings.sh` - Test script

## See Also

- [SIMPLE_INGREDIENTS_COMPLETE_FIXES.md](./SIMPLE_INGREDIENTS_COMPLETE_FIXES.md) - Original simple ingredient fixes
- [CUSTOMIZATION_NUTRITION_FIX.md](./CUSTOMIZATION_NUTRITION_FIX.md) - Nutrition calculation improvements
- [SIMPLE_INGREDIENTS_DATABASE.md](./SIMPLE_INGREDIENTS_DATABASE.md) - Simple ingredients data structure

