# Custom Recipe Nutrition Format Fix (Bug #11)

## Problem
Creating custom recipes failed with error:
```
"Cannot read properties of undefined (reading 'protein')"
```

## Root Cause

The `calculateRecipeNutrition` method expected **nested** nutrition format:
```json
{
  "nutritionData": {
    "calories": 105,
    "macros": {
      "protein": 1.3,
      "carbs": 27,
      "fat": 0.4,
      "fiber": 3.1
    },
    "micros": {
      "vitamins": {},
      "minerals": {}
    }
  }
}
```

But users were providing **flat** format (which is more intuitive):
```json
{
  "nutritionData": {
    "calories": 105,
    "protein": 1.3,
    "carbs": 27,
    "fat": 0.4,
    "fiber": 3.1
  }
}
```

The code tried to access `nutrition.macros.protein` which was `undefined`, causing the error.

## Solution

**File**: `lib/customRecipeService.ts` (Lines 361-405)

Updated to support **both formats**:

```typescript
// Support both flat and nested format
const macros = nutrition.macros || nutrition; // Fallback to root if no macros object

// Accumulate macros
totalProteinG += macros.protein || 0;
totalCarbsG += macros.carbs || 0;
totalFatG += macros.fat || 0;
totalFiberG += macros.fiber || 0;
totalSugarG += macros.sugar || 0;
totalSodiumMg += macros.sodium || 0;

// Accumulate extended macros (if available)
if (nutrition.macros) {
  ['cholesterol', 'saturatedFat', ...].forEach(macro => {
    if (nutrition.macros[macro] !== undefined) {
      detailedNutrition[macro] += nutrition.macros[macro];
    }
  });
}

// Accumulate vitamins (if available)
if (nutrition.micros?.vitamins) {
  Object.keys(nutrition.micros.vitamins).forEach(vitamin => {
    detailedNutrition[`vitamins_${vitamin}`] += nutrition.micros.vitamins[vitamin];
  });
}

// Accumulate minerals (if available)
if (nutrition.micros?.minerals) {
  Object.keys(nutrition.micros.minerals).forEach(mineral => {
    detailedNutrition[`minerals_${mineral}`] += nutrition.micros.minerals[mineral];
  });
}
```

## Supported Formats

### Format 1: Flat (Simple, Intuitive) ✅ NOW SUPPORTED
```json
{
  "name": "banana",
  "quantity": 2,
  "unit": "medium",
  "nutritionData": {
    "calories": 105,
    "protein": 1.3,
    "carbs": 27,
    "fat": 0.4,
    "fiber": 3.1
  }
}
```

### Format 2: Nested (Full Detail) ✅ ALREADY SUPPORTED
```json
{
  "name": "banana",
  "quantity": 2,
  "unit": "medium",
  "nutritionData": {
    "calories": 105,
    "macros": {
      "protein": 1.3,
      "carbs": 27,
      "fat": 0.4,
      "fiber": 3.1,
      "sugar": 14.4,
      "sodium": 1
    },
    "micros": {
      "vitamins": {
        "vitaminC": 10.3,
        "vitaminA": 76
      },
      "minerals": {
        "potassium": 422,
        "calcium": 14
      }
    }
  }
}
```

## Testing

### Create Recipe with Flat Format (Now Works!)
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/recipes/custom' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -H 'content-type: application/json' \
  --data-raw '{
    "recipeName": "Simple Smoothie",
    "servings": 2,
    "isPublic": true,
    "ingredients": [
      {
        "name": "banana",
        "quantity": 2,
        "unit": "medium",
        "nutritionData": {
          "calories": 105,
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1
        }
      }
    ],
    "instructions": ["Blend and serve"]
  }'
```

**Expected**: ✅ Recipe created successfully!

## Impact

After this fix:
- ✅ Users can provide simple flat nutrition data
- ✅ Users can still provide nested format for detailed nutrition
- ✅ No more "Cannot read properties of undefined" errors
- ✅ More intuitive API for custom recipe creation

## Files Changed

- ✅ `lib/customRecipeService.ts` - Lines 361-405

## Related Bugs

This is **Bug #11** - discovered while testing custom recipe search fix.

