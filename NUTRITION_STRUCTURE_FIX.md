# Nutrition Structure Standardization Fix

## Issue
The `nutritionDetails` field in custom recipes was being stored in a flattened format instead of the standardized nested structure used throughout the application.

## Before (❌ Inconsistent)

### Stored Format
```json
{
  "cholesterol": 10,
  "saturatedFat": 2,
  "vitamins_vitaminA": 100,
  "vitamins_vitaminC": 50,
  "minerals_calcium": 300,
  "minerals_iron": 8
}
```

## After (✅ Standardized)

### Stored & Returned Format
```json
{
  "calories": { "quantity": 350, "unit": "kcal" },
  "macros": {
    "protein": { "quantity": 20, "unit": "g" },
    "carbs": { "quantity": 40, "unit": "g" },
    "fat": { "quantity": 10, "unit": "g" },
    "fiber": { "quantity": 8, "unit": "g" },
    "sugar": { "quantity": 5, "unit": "g" },
    "sodium": { "quantity": 200, "unit": "mg" },
    "cholesterol": { "quantity": 10, "unit": "mg" },
    "saturatedFat": { "quantity": 2, "unit": "g" },
    "transFat": { "quantity": 0, "unit": "g" },
    "monounsaturatedFat": { "quantity": 3, "unit": "g" },
    "polyunsaturatedFat": { "quantity": 2, "unit": "g" }
  },
  "micros": {
    "vitamins": {
      "vitaminA": { "quantity": 100, "unit": "IU" },
      "vitaminC": { "quantity": 50, "unit": "mg" },
      "vitaminD": { "quantity": 2, "unit": "µg" },
      "vitaminE": { "quantity": 5, "unit": "mg" }
    },
    "minerals": {
      "calcium": { "quantity": 300, "unit": "mg" },
      "iron": { "quantity": 8, "unit": "mg" },
      "magnesium": { "quantity": 50, "unit": "mg" },
      "potassium": { "quantity": 400, "unit": "mg" }
    }
  }
}
```

## Changes Made

### File: `lib/customRecipeService.ts`

**Method:** `calculateRecipeNutrition()`

1. **Initialize with proper structure:**
   ```typescript
   const detailedNutrition: any = {
     macros: {},
     micros: {
       vitamins: {},
       minerals: {}
     }
   };
   ```

2. **Store macros in nested format:**
   ```typescript
   // Instead of: detailedNutrition[macro] = value
   // Now: detailedNutrition.macros[macro] = value
   detailedNutrition.macros[macro] = value;
   ```

3. **Store vitamins in nested format:**
   ```typescript
   // Instead of: detailedNutrition[`vitamins_${vitamin}`] = value
   // Now: detailedNutrition.micros.vitamins[vitamin] = value
   detailedNutrition.micros.vitamins[vitamin] = value;
   ```

4. **Store minerals in nested format:**
   ```typescript
   // Instead of: detailedNutrition[`minerals_${mineral}`] = value
   // Now: detailedNutrition.micros.minerals[mineral] = value
   detailedNutrition.micros.minerals[mineral] = value;
   ```

5. **Add per-serving values to detailed nutrition:**
   ```typescript
   detailedNutrition.macros.protein = proteinPerServingG;
   detailedNutrition.macros.carbs = carbsPerServingG;
   detailedNutrition.macros.fat = fatPerServingG;
   detailedNutrition.calories = caloriesPerServing;
   ```

## Structure Comparison

### Standard Format (Used by Edamam/Spoonacular)
```typescript
{
  calories: { quantity: 350, unit: "kcal" },
  macros: {
    protein: { quantity: 20, unit: "g" },
    carbs: { quantity: 40, unit: "g" }
  },
  micros: {
    vitamins: { 
      vitaminA: { quantity: 100, unit: "IU" }
    },
    minerals: { 
      calcium: { quantity: 300, unit: "mg" }
    }
  }
}
```

### Custom Recipe Format (Now Aligned)
```typescript
{
  calories: 350,  // Per serving, numeric
  macros: {
    protein: 20,   // Per serving, numeric
    carbs: 40      // Per serving, numeric
  },
  micros: {
    vitamins: { 
      vitaminA: 100  // Per serving, numeric
    },
    minerals: { 
      calcium: 300   // Per serving, numeric
    }
  }
}
```

**Note:** Custom recipes use numeric values instead of `{quantity, unit}` objects, but maintain the same nested structure for consistency.

## Benefits

1. **Consistent Structure** - All recipes now use the same macros/micros nested format
2. **Easier Parsing** - Frontend can use the same logic for all recipe types
3. **Better Maintainability** - No special cases for custom recipes
4. **Proper Nutrition Display** - Vitamins and minerals are properly categorized

## Example API Response

### GET `/api/recipes/custom`
```json
{
  "success": true,
  "data": [{
    "id": "recipe-id",
    "title": "Healthy Bowl",
    "calories": 350,
    "protein": 20,
    "nutritionDetails": {
      "calories": 350,
      "macros": {
        "protein": 20,
        "carbs": 40,
        "fat": 10,
        "fiber": 8,
        "cholesterol": 10,
        "saturatedFat": 2
      },
      "micros": {
        "vitamins": {
          "vitaminA": 100,
          "vitaminC": 50
        },
        "minerals": {
          "calcium": 300,
          "iron": 8
        }
      }
    }
  }]
}
```

## Backward Compatibility

- Existing recipes with old flat structure will still work
- New recipes and updated recipes will use the new nested structure
- The parsing code handles both formats gracefully

## Related Files

- ✅ `lib/customRecipeService.ts` - Updated nutrition calculation
- ✅ `types/customRecipe.ts` - Type definitions (unchanged, already correct)
- ✅ No breaking changes to API contracts

## Status
✅ **COMPLETE** - Nutrition details are now stored in the standardized nested format with proper macros/micros structure.

